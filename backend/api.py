import io
import json
import re
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field

from card_service import BASE, FIELD_KEYS, Pipeline, Store, map_structured, now
from evaluation_import import import_evaluation

MAX_BYTES = 15 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 25_000_000
store = Store()
pipeline = Pipeline(store)


@asynccontextmanager
async def lifespan(app):
    import_evaluation(store)
    for card in store.all():
        if card['status'] in ('uploading', 'ocr_processing', 'ai_structuring'):
            store.update(card['id'], status='failed', error='서버가 재시작되어 처리가 중단됐습니다. 재시도하세요.')
    yield
    pipeline.close()


app = FastAPI(title='ThinkTree local OCR API', lifespan=lifespan)


def get_card(card_id):
    try:
        return store.get(card_id)
    except KeyError:
        raise HTTPException(404, '명함을 찾을 수 없습니다.')


@app.get('/api/health')
def health():
    return {'status': 'ok', 'mode': 'local-development', 'engines': ['local', 'gemini', 'claude']}


@app.get('/api/cards')
def cards():
    return store.all()


@app.post('/api/evaluation/import')
def import_saved_evaluation():
    with store.lock:
        return import_evaluation(store)


@app.get('/api/evaluation/report')
def evaluation_report():
    path = BASE / 'OCR_테스트_결과.html'
    if not path.is_file():
        raise HTTPException(404, '저장된 OCR 보고서가 없습니다.')
    return FileResponse(path, media_type='text/html', headers={
        'Content-Security-Policy': "default-src 'none'; img-src data: 'self'; style-src 'unsafe-inline'; sandbox",
        'Cache-Control': 'no-store',
    })


@app.get('/api/cards/{card_id}')
def card_detail(card_id: str):
    return get_card(card_id)


@app.get('/api/cards/{card_id}/image')
def image(card_id: str):
    card = get_card(card_id)
    path = store.images / f'{card["id"]}.png'
    if not path.is_file():
        raise HTTPException(404, '원본 이미지가 없습니다.')
    return FileResponse(path, media_type='image/png', headers={'Cache-Control': 'private, max-age=3600'})


def stored_asset(card_id, kind):
    card = get_card(card_id)
    extension = card.get(f'{kind}Extension')
    if extension not in ('.jpg', '.jpeg', '.png', '.bmp', '.webp'):
        if kind == 'original':
            return image(card_id)
        raise HTTPException(404, 'OCR 영역 이미지가 없습니다.')
    directory = store.originals if kind == 'original' else store.visualizations
    path = directory / f'{card["id"]}{extension}'
    if not path.is_file():
        raise HTTPException(404, '이미지 파일이 없습니다.')
    return FileResponse(path, headers={'Cache-Control': 'private, max-age=3600'})


@app.get('/api/cards/{card_id}/original')
def original_image(card_id: str):
    return stored_asset(card_id, 'original')


@app.get('/api/cards/{card_id}/ocr-image')
def ocr_image(card_id: str):
    return stored_asset(card_id, 'visualization')


def normalize_image(content):
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ('JPEG', 'PNG', 'WEBP', 'BMP'):
                raise ValueError('JPG, PNG, WEBP, BMP 이미지를 사용하세요.')
            if image.width * image.height > Image.MAX_IMAGE_PIXELS:
                raise ValueError('이미지는 2,500만 화소 이하로 등록하세요.')
            extension = {'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp', 'BMP': '.bmp'}[image.format]
            image = ImageOps.exif_transpose(image).convert('RGB')
            if min(image.size) < 40:
                raise ValueError('이미지가 너무 작습니다.')
            image.thumbnail((2400, 2400))
            return image.copy(), extension
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(400, str(exc) if isinstance(exc, ValueError) else '읽을 수 없는 이미지입니다.')


@app.post('/api/cards', status_code=202)
async def upload(file: UploadFile = File(...), ownerId: str = Form('e1'),
                 engine: Literal['local', 'gemini', 'claude'] = Form('local'),
                 language: Literal['auto', 'ko', 'ja', 'en'] = Form('auto')):
    if ownerId not in ('e1', 'e2', 'e3', 'e4', 'e5'):
        raise HTTPException(400, '알 수 없는 소유자입니다.')
    content = await file.read(MAX_BYTES + 1)
    await file.close()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, '파일은 15MB 이하로 등록하세요.')
    image, extension = normalize_image(content)
    card = store.create(ownerId, engine, language)
    try:
        image.save(store.images / f'{card["id"]}.png')
        store.originals.mkdir(exist_ok=True)
        (store.originals / f'{card["id"]}{extension}').write_bytes(content)
        card = store.update(card['id'], originalExtension=extension,
                            originalUrl=f'/api/cards/{card["id"]}/original',
                            sourceFileName=(file.filename or '명함').replace('\\', '/').split('/')[-1][:255])
    except OSError:
        store.update(card['id'], status='failed', error='이미지 저장에 실패했습니다.')
        raise HTTPException(500, '이미지 저장에 실패했습니다.')
    pipeline.submit(card['id'])
    return card


@app.post('/api/cards/{card_id}/retry', status_code=202)
def retry(card_id: str):
    with store.lock:
        card = get_card(card_id)
        if card['status'] != 'failed' or card.get('source') == 'sample':
            raise HTTPException(409, '실패한 업로드 명함만 재시도할 수 있습니다.')
        card = store.update(card_id, status='ocr_processing', error=None)
    pipeline.submit(card_id)
    return card


class FieldValue(BaseModel):
    model_config = ConfigDict(extra='forbid')
    value: str = Field(max_length=2000)
    confidence: Literal['high', 'medium', 'low']


class Review(BaseModel):
    model_config = ConfigDict(extra='forbid')
    extracted: dict[str, FieldValue]
    action: Literal['draft', 'confirm'] = 'draft'
    effectiveDate: date | None = None
    personLink: str | None = Field(default=None, max_length=100)
    companyLink: str | None = Field(default=None, max_length=100)


@app.put('/api/cards/{card_id}/review')
def review(card_id: str, body: Review):
    with store.lock:
        card = get_card(card_id)
        if card['status'] not in ('ready_for_review', 'reviewed'):
            raise HTTPException(409, '처리가 끝난 명함만 저장할 수 있습니다.')
        if set(body.extracted) != set(FIELD_KEYS):
            raise HTTPException(422, '추출 필드 구성이 올바르지 않습니다.')
        extracted = {k: dict(value=v.value.strip(), confidence=v.confidence) for k, v in body.extracted.items()}
        if body.action == 'confirm':
            if not extracted['name']['value'] or not extracted['company']['value']:
                raise HTTPException(422, '확정하려면 회사명과 이름을 입력하세요.')
            email = extracted['email']['value']
            if email and not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email):
                raise HTTPException(422, '이메일 형식을 확인하세요.')
            for key in ('phone', 'mobile', 'fax'):
                value = extracted[key]['value']
                if value and not 7 <= len(re.sub(r'\D', '', value)) <= 15:
                    raise HTTPException(422, '전화번호 형식을 확인하세요.')
        status = 'reviewed' if body.action == 'confirm' or card['status'] == 'reviewed' else 'ready_for_review'
        changes = {}
        if 'effectiveDate' in body.model_fields_set:
            if body.effectiveDate and body.effectiveDate > date.today():
                raise HTTPException(422, '기준일은 오늘 이전 또는 오늘로 지정하세요.')
            changes['effectiveDate'] = body.effectiveDate.isoformat() if body.effectiveDate else None
        for key in ('personLink', 'companyLink'):
            if key not in body.model_fields_set:
                continue
            link = getattr(body, key)
            seen = {card_id}
            target = link
            while target and target != 'separate':
                if target in seen:
                    raise HTTPException(422, '서로를 참조하는 연결은 저장할 수 없습니다.')
                seen.add(target)
                reference = get_card(target)
                if reference['status'] != 'reviewed':
                    raise HTTPException(422, '확정된 명함만 연결할 수 있습니다.')
                target = reference.get(key)
            changes[key] = link
        dependents = {}
        for key in ('personLink', 'companyLink'):
            if changes.get(key) != 'separate' or card.get(key) == 'separate':
                continue
            linked = sorted((item for item in store.all() if item.get(key) == card_id), key=lambda item: (item['uploadedAt'], item['id']))
            # Keep the remaining explicit links together when their reference card is split off.
            anchor = card.get(key) or (linked[0]['id'] if linked else None)
            for item in linked:
                updated = dependents.setdefault(item['id'], item)
                updated[key] = None if item['id'] == anchor else anchor
        card.update(extracted=extracted, status=status,
                    reviewedAt=now() if status == 'reviewed' else None, **changes)
        store.put_many([card, *dependents.values()])
        return card


@app.delete('/api/cards/{card_id}', status_code=204)
def reject(card_id: str):
    with store.lock:
        card = get_card(card_id)
        if card['status'] not in ('ready_for_review', 'failed'):
            raise HTTPException(409, '검토 대기 또는 실패한 명함만 삭제할 수 있습니다.')
        with store.connect() as db:
            db.execute('DELETE FROM cards WHERE id=?', (card_id,))
        (store.images / f'{card["id"]}.png').unlink(missing_ok=True)
        for kind, directory in [('original', store.originals), ('visualization', store.visualizations)]:
            extension = card.get(f'{kind}Extension')
            if extension in ('.jpg', '.jpeg', '.png', '.bmp', '.webp'):
                (directory / f'{card["id"]}{extension}').unlink(missing_ok=True)


@app.post('/api/samples/{sample_id}', status_code=201)
def sample(sample_id: Literal['sample1', 'sample2'], ownerId: Literal['e1', 'e2', 'e3', 'e4', 'e5'] = 'e1'):
    # Only fictional demo cards are exposed; private evaluation cards are never listed.
    saved = json.loads((BASE / 'demo' / 'out' / f'{sample_id}.json').read_text(encoding='utf-8'))
    card = store.create(ownerId, 'saved-sample', 'auto', source='sample')
    with Image.open(BASE / 'demo' / f'{sample_id}.png') as image:
        image.convert('RGB').save(store.images / f'{card["id"]}.png')
    return store.update(card['id'], status='ready_for_review',
                        extracted=map_structured(saved['llm_structured_json']),
                        confidence=round(saved['confidence_score'] * 100, 1),
                        ocrRawText=saved['ocr_raw_text'], language=saved['language'],
                        structured=saved['llm_structured_json'], warnings=saved['warnings'],
                        departmentPath=saved['llm_structured_json'].get('departments', []),
                        model=saved.get('model'), source='sample')
