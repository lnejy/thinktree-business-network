"""Local, persistent business-card pipeline. Existing evaluation scripts stay unchanged."""
import json
import logging
import os
import re
import sqlite3
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = Path(os.environ.get('THINKTREE_DATA_DIR', str(BASE / 'runtime')))
FIELD_KEYS = ('company', 'name', 'nameEn', 'branch', 'department', 'team', 'position',
              'phone', 'mobile', 'email', 'address', 'website', 'fax', 'postalCode', 'address2')
log = logging.getLogger(__name__)


def now():
    return datetime.now(timezone.utc).isoformat()


def empty_fields():
    return {key: {'value': '', 'confidence': 'low'} for key in FIELD_KEYS}


class Store:
    def __init__(self, directory=DATA):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.images = self.directory / 'images'
        self.images.mkdir(exist_ok=True)
        self.originals = self.directory / 'originals'
        self.visualizations = self.directory / 'visualizations'
        self.db = self.directory / 'cards.sqlite3'
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, body TEXT NOT NULL)')
        self.lock = threading.RLock()

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.db, timeout=30)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def all(self):
        with self.connect() as db:
            return [json.loads(row[0]) for row in db.execute('SELECT body FROM cards ORDER BY rowid DESC')]

    def get(self, card_id):
        with self.connect() as db:
            row = db.execute('SELECT body FROM cards WHERE id=?', (card_id,)).fetchone()
        if not row:
            raise KeyError(card_id)
        return json.loads(row[0])

    def put(self, card):
        with self.connect() as db:
            db.execute('INSERT INTO cards VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
                       (card['id'], json.dumps(card, ensure_ascii=False)))
        return card

    def update(self, card_id, **changes):
        with self.lock:
            card = self.get(card_id)
            card.update(changes)
            return self.put(card)

    def create(self, owner, engine, language, source='upload'):
        card_id = str(uuid.uuid4())
        return self.put(dict(id=card_id, ownerId=owner, status='ocr_processing',
                             imageUrl=f'/api/cards/{card_id}/image', uploadedAt=now(),
                             confidence=0, extracted=empty_fields(), engine=engine,
                             requestedLanguage=language, source=source, warnings=[], ocrRawText=''))


def map_structured(fields, confidence=0):
    company, site, person = (fields.get(k) or {} for k in ('company', 'site', 'person'))
    departments = fields.get('departments') or []
    address = site.get('address') or ''
    extra_addresses = (fields.get('extra') or {}).get('addresses') or []
    postal = re.search(r'(?<!\d)(?:\d{3}-\d{4}|\d{5})(?!\d)', address)
    values = dict(company=company.get('name'), name=person.get('name'), nameEn=person.get('name_reading'),
                  branch=site.get('name'), department=departments[0] if departments else '',
                  team=' / '.join(departments[1:]), position=person.get('title'),
                  phone=person.get('tel') or site.get('tel'), mobile=person.get('mobile'),
                  email=person.get('email'), address=address, website=company.get('homepage_url'),
                  fax=site.get('fax'), postalCode=postal.group() if postal else '',
                  address2=next((a for a in extra_addresses if a and a != address), ''))
    # An aggregate OCR score cannot substantiate per-field certainty.
    return {k: dict(value=str(values.get(k) or ''), confidence='medium' if values.get(k) else 'low')
            for k in FIELD_KEYS}


def local_fields(lines):
    """Conservative fallback: extract formats/explicit labels, never invent company/name."""
    text = '\n'.join(lines)
    emails = re.findall(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', text)
    urls = re.findall(r'(?:https?://|www\.)[^\s,]+', text)
    phones = re.findall(r'\+?\d[\d ()-]{6,}\d', text)
    person = dict(name=None, name_reading=None, title=None, email=emails[0] if emails else None,
                  mobile=None, tel=None, aliases=[])
    site = dict(name=None, site_type=None, address=None, tel=None, fax=None)
    company = dict(name=None, brand_name=None, aliases=[], registration_no=None,
                   homepage_url=urls[0] if urls else None)
    labels = [(r'^(?:성명|이름|Name)\s*[:：]\s*(.+)$', person, 'name'),
              (r'^(?:회사명|Company)\s*[:：]\s*(.+)$', company, 'name'),
              (r'^(?:주소|Address)\s*[:：]\s*(.+)$', site, 'address'),
              (r'^(?:직책|직급|Title)\s*[:：]\s*(.+)$', person, 'title')]
    for line in lines:
        for pattern, target, key in labels:
            match = re.match(pattern, line.strip(), re.I)
            if match:
                target[key] = match[1]
        for phone in phones:
            if phone not in line:
                continue
            if re.search(r'(fax|팩스|F\s*[.:])', line, re.I):
                site['fax'] = phone
            elif re.sub(r'\D', '', phone).startswith(('010', '8210')) or re.search(r'(mobile|휴대|携帯|M\s*[.:])', line, re.I):
                person['mobile'] = phone
            elif not person['tel']:
                person['tel'] = phone
    return dict(company=company, site=site, person=person, departments=[], has_handwritten_note=False,
                extra=dict(phones=phones, emails=emails, addresses=[], unmapped=lines))


class Pipeline:
    def __init__(self, store):
        self.store = store
        self.pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix='card-ocr')
        self.engines = {}

    def submit(self, card_id):
        self.pool.submit(self.process, card_id)

    def recognize(self, path, language):
        import ocr_test
        langs = ['korean', 'default'] if language == 'auto' else [dict(ko='korean', ja='japan', en='en')[language]]
        results = {}
        for lang in langs:
            if lang not in self.engines:
                self.engines[lang] = ocr_test.PaddleOCR(**ocr_test.COMMON, **({} if lang == 'default' else {'lang': lang}))
            results[lang] = ocr_test.run_model(self.engines[lang], path)
        chosen = max(results, key=lambda k: results[k]['avg_score'])
        best = results[chosen]
        return dict(lines=best['lines'], avg_score=best['avg_score'], chosen_model=chosen,
                    language=ocr_test.detect_language(' '.join(best['texts'])),
                    boxes=best['boxes'], texts=best['texts'], scores=best['scores'])

    def process(self, card_id):
        try:
            card = self.store.get(card_id)
            path = self.store.images / f'{card_id}.png'
            ocr = self.recognize(path, card['requestedLanguage'])
            if not ocr['lines']:
                raise ValueError('인식된 글자가 없습니다. 더 선명한 사진으로 다시 등록하세요.')
            self.store.update(card_id, status='ai_structuring', ocrRawText='\n'.join(ocr['lines']),
                              confidence=round(ocr['avg_score'] * 100, 1), language=ocr['language'], ocr=ocr)
            fields = local_fields(ocr['lines'])
            warnings = ['로컬 규칙 추출입니다. 회사명·이름·부서 등 공란은 원본을 보고 입력하세요.']
            model = 'local-rules'
            if card['engine'] != 'local':
                import ocr_extract
                try:
                    from dotenv import load_dotenv
                    load_dotenv(BASE / '.env')
                    engine = ocr_extract.ENGINES[card['engine']]()
                    env_model = os.getenv(f'THINKTREE_{card["engine"].upper()}_MODEL')
                    if env_model:
                        engine.model = env_model
                    fields, model, _, _ = engine.extract(ocr_extract.encode_image(path), ocr_extract.ocr_prompt(ocr))
                    warnings = ocr_extract.check(fields)
                except Exception:
                    log.exception('External structuring failed for %s', card_id)
                    warnings.append('외부 AI 구조화에 실패했습니다. OCR 원문과 로컬 추출 결과를 검토하세요. 서버의 키·모델·이용 한도를 확인하세요.')
            self.store.update(card_id, status='ready_for_review', extracted=map_structured(fields),
                              structured=fields, model=model, warnings=warnings, error=None,
                              departmentPath=fields.get('departments') or [])
        except Exception as exc:
            log.exception('OCR failed for %s', card_id)
            message = str(exc) if isinstance(exc, ValueError) else 'OCR 실행에 실패했습니다. 서버 로그와 모델 설치 상태를 확인한 뒤 재시도하세요.'
            self.store.update(card_id, status='failed', error=message[:400])

    def close(self):
        self.pool.shutdown(wait=True)
