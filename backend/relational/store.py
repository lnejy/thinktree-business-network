import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import quote

from . import queries
from .names import normalize_company_name
from .resolver import assign_links, card_date, confirmed_in_order, domain, newest_first, val

NO_SITE = '사업소 미확인'
SCHEMA = (Path(__file__).with_name('schema.sql')).read_text(encoding='utf-8')
FIELD_KEYS = ('company', 'name', 'nameEn', 'branch', 'department', 'team', 'position', 'phone', 'mobile',
              'email', 'address', 'website', 'fax', 'postalCode', 'address2')
enc = lambda s: quote(s, safe="-_.!~*'()")      # JavaScript encodeURIComponent 와 같은 결과


def department_path(card):
    """cardApi.ts companyTree 와 같은 규칙: 원래 부서 경로가 필드와 일치하면 그것을, 아니면 필드에서 만든다."""
    original = [d if isinstance(d, str) else (d or {}).get('name') or '' for d in (card.get('departmentPath') or [])]
    department, team = val(card, 'department'), val(card, 'team')
    if department == (original[0] if original else '') and team == ' / '.join(original[1:]):
        return [d for d in original if d]
    return [d for d in [department, *team.split(' / ')] if d]


class RelationalStore:
    """확정 명함 → 회사/사업소/부서/사람/명함 테이블. 명함이 바뀔 때마다 전체를 다시 만들어 프런트(hydrateCards)와 같은 결과를 보장한다."""

    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():              # 첫 실행: 재생성이 실패해도 조회가 오류 나지 않도록 빈 스키마를 둔다
            with self.connect() as db:
                db.executescript(SCHEMA)

    @contextmanager
    def connect(self):
        conn = sqlite3.connect(self.path, timeout=30)
        conn.row_factory = sqlite3.Row
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def rebuild(self, cards):
        actual = confirmed_in_order(cards)
        company_of, person_of = assign_links(actual, 'company'), assign_links(actual, 'person')
        by_company, by_person = {}, {}
        for card in actual:
            by_company.setdefault(company_of[card['id']][0], []).append(card)
            by_person.setdefault(person_of[card['id']][0], []).append(card)
        tmp = self.path.with_name(self.path.name + '.tmp')     # 임시 파일에 다 만든 뒤 한 번에 교체: 실패하면 이전 결과가 그대로 남는다
        tmp.unlink(missing_ok=True)
        conn = sqlite3.connect(tmp, timeout=30)
        try:
            with conn:
                self._populate(conn, actual, company_of, person_of, by_company, by_person)
        except BaseException:
            conn.close()
            tmp.unlink(missing_ok=True)
            raise
        conn.close()
        for attempt in range(10):               # Windows 는 다른 연결이 열려 있으면 교체가 잠시 막힐 수 있다
            try:
                os.replace(tmp, self.path)
                return
            except PermissionError:
                if attempt == 9:
                    tmp.unlink(missing_ok=True)
                    raise
                time.sleep(0.1)

    def _populate(self, db, actual, company_of, person_of, by_company, by_person):
        db.executescript(SCHEMA)
        for company_id, history in by_company.items():
            latest = newest_first(history)[0]
            raw = (latest.get('structured') or {}).get('company') or {}
            db.execute('INSERT INTO company VALUES (?,?,?,?,?,?,?)', (
                company_id, val(latest, 'company'), normalize_company_name(val(latest, 'company')), domain(latest),
                val(latest, 'address'), raw.get('registration_no'), val(latest, 'website') or raw.get('homepage_url')))
        sites, departments = set(), set()
        for card in newest_first(actual):          # 가장 최근 명함의 주소·전화를 사업소 정보로 쓴다
            company_id = company_of[card['id']][0]
            site_id = f'{company_id}/{enc(val(card, "branch") or NO_SITE)}'
            if site_id not in sites:
                sites.add(site_id)
                site = (card.get('structured') or {}).get('site') or {}
                db.execute('INSERT INTO site VALUES (?,?,?,?,?,?)', (
                    site_id, company_id, val(card, 'branch') or NO_SITE, val(card, 'address'), site.get('tel'), site.get('fax')))
        leaf_of = {}
        for card in actual:
            company_id = company_of[card['id']][0]
            site_id = f'{company_id}/{enc(val(card, "branch") or NO_SITE)}'
            parent, leaf = None, None
            for level, name in enumerate(department_path(card), start=1):
                leaf = f'{parent or site_id}/{enc(name)}'
                if leaf not in departments:
                    departments.add(leaf)
                    db.execute('INSERT INTO department VALUES (?,?,?,?,?)', (leaf, site_id, parent, name, level))
                parent = leaf
            leaf_of[card['id']] = (site_id, leaf)
        for person_id, history in by_person.items():
            history = newest_first(history)
            latest = history[0]
            owners = list(dict.fromkeys(c.get('ownerId') for c in history))
            db.execute('INSERT INTO person VALUES (?,?,?,?,?,?,?,?,?,?,?)', (
                person_id, company_of[latest['id']][0], *(val(latest, k) for k in (
                    'name', 'nameEn', 'department', 'team', 'position', 'phone', 'mobile', 'email')),
                json.dumps(owners, ensure_ascii=False)))
            for owner in owners:
                db.execute('INSERT OR IGNORE INTO connection VALUES (?,?)', (owner, person_id))
        for card in actual:
            site_id, leaf = leaf_of[card['id']]
            db.execute('INSERT INTO card VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', (
                card['id'], person_of[card['id']][0], company_of[card['id']][0], site_id, leaf, card.get('ownerId'),
                card.get('effectiveDate'), card_date(card), card['uploadedAt'], card.get('reviewedAt'),
                card.get('personLink'), card.get('companyLink'),
                json.dumps(person_of[card['id']][1], ensure_ascii=False), json.dumps(company_of[card['id']][1], ensure_ascii=False),
                json.dumps({k: val(card, k) for k in FIELD_KEYS}, ensure_ascii=False),
                json.dumps(department_path(card), ensure_ascii=False)))

    # ── 조회 (queries.py) ──
    def companies(self):
        with self.connect() as db:
            return queries.companies(db)

    def org_tree(self, company_id, as_of=None):
        with self.connect() as db:
            return queries.org_tree(db, company_id, as_of)

    def person_history(self, person_id):
        with self.connect() as db:
            return queries.person_history(db, person_id)

    def shared_affiliations(self, person_id):
        with self.connect() as db:
            return queries.shared_affiliations(db, person_id)

    def current_affiliations(self, as_of=None):
        with self.connect() as db:
            return queries.current_affiliations(db, as_of)
