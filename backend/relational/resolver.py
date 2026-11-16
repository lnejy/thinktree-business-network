"""회사·인물 판별. frontend/src/cardApi.ts 의 matchEvidence / assignLinks / newestFirst 를 옮긴 것이다.
다른 점 하나: 회사명 정규화는 cardApi.ts 의 정규식이 아니라 팀장님의 normalize.py 규칙(names.py)을 쓴다."""
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .names import normalize_company_name

try:
    SEOUL = ZoneInfo('Asia/Seoul')
except ZoneInfoNotFoundError:               # Windows 에는 시간대 데이터가 없을 수 있다. 한국은 1988년 이후 일광절약시간이 없어 UTC+9 고정과 같다.
    SEOUL = timezone(timedelta(hours=9), 'KST')
FREE_MAIL = {'gmail.com', 'naver.com', 'daum.net', 'hanmail.net', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'}
GENERIC_MAILBOX = re.compile(r'^(?:info|contact|sales|admin|office|support|hello|help|hr|reception|team)\+?[^@]*@', re.I)
EMAIL_FORMAT = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def val(card, key):
    return ((card.get('extracted') or {}).get(key) or {}).get('value') or ''


def norm(s):
    return ''.join(ch for ch in unicodedata.normalize('NFKC', s or '').lower() if ch.isalnum())


def digits(s):
    return re.sub(r'^82(?:0)?(?=10\d{8}$)', '0', re.sub(r'\D', '', s or ''))


def same(a, b):
    return bool(a) and a == b


def domain(card):
    web = val(card, 'website').strip()
    if web:
        try:
            host = urlparse(web if re.match(r'https?://', web, re.I) else f'https://{web}').hostname
        except ValueError:
            host = None
        if host:
            return re.sub(r'^www\.', '', host.lower())
    email = val(card, 'email')
    host = email.split('@')[1].lower() if '@' in email else ''
    return '' if host in FREE_MAIL else host


def card_date(card):
    if card.get('effectiveDate'):
        return card['effectiveDate']
    moment = datetime.fromisoformat(card['uploadedAt'])
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=SEOUL)
    return moment.astimezone(SEOUL).strftime('%Y-%m-%d')


def newest_first(cards):
    return sorted(cards, key=lambda c: (card_date(c), bool(c.get('effectiveDate')), c['uploadedAt'], c['id']), reverse=True)


def _company_names(card):
    primary = normalize_company_name(val(card, 'company'))
    raw = (card.get('structured') or {}).get('company') or {}
    aliases = [normalize_company_name(n) for n in [raw.get('name') or '', *(raw.get('aliases') or [])]]
    return [a for a in aliases if a] if primary in aliases else ([primary] if primary else [])


def _office_phone(card):
    return digits(((card.get('structured') or {}).get('site') or {}).get('tel') or '')


def match_evidence(card, other, kind):
    """(근거 문구 목록, 자동 연결 가능 여부)"""
    reasons = []
    if kind == 'company':
        name = any(n in _company_names(other) for n in _company_names(card))
        host_a, host_b = domain(card), domain(other)
        host = same(host_a, host_b)
        address = same(norm(val(card, 'address')), norm(val(other, 'address')))
        postal = same(norm(val(card, 'postalCode')), norm(val(other, 'postalCode')))
        branch = same(norm(val(card, 'branch')), norm(val(other, 'branch')))
        phone = len(_office_phone(card)) >= 7 and same(_office_phone(card), _office_phone(other))
        if name: reasons.append('정규화한 회사명 또는 별칭 일치')
        if host: reasons.append('홈페이지 또는 업무 이메일 도메인 일치')
        if address: reasons.append('주소 일치')
        if phone: reasons.append('사업소 대표 전화번호 일치')
        if reasons and postal: reasons.append('우편번호 일치')
        if reasons and branch: reasons.append('본사·지점 표기 일치')
        if host_a and host_b and host_a != host_b:
            if reasons:
                reasons.append('업무 도메인이 서로 다름')
            return reasons, False
        return reasons, bool((name and (host or address or (phone and postal))) or (host and address))
    name = same(norm(val(card, 'name')), norm(val(other, 'name')))
    romanized = same(norm(val(card, 'nameEn')), norm(val(other, 'nameEn')))
    email_a = val(card, 'email').strip().lower()
    email = same(email_a, val(other, 'email').strip().lower()) and bool(EMAIL_FORMAT.match(email_a)) and not GENERIC_MAILBOX.match(email_a)
    mobile_a = digits(val(card, 'mobile'))
    mobile = len(mobile_a) >= 9 and same(mobile_a, digits(val(other, 'mobile')))
    if name: reasons.append('이름 일치')
    if romanized: reasons.append('영문 이름 일치')
    if email: reasons.append('개인 이메일 일치')
    if mobile: reasons.append('휴대전화 일치')
    if reasons and same(normalize_company_name(val(card, 'company')), normalize_company_name(val(other, 'company'))):
        reasons.append('회사명 일치')
    if reasons and same(norm(val(card, 'department')), norm(val(other, 'department'))):
        reasons.append('부서명 일치')
    return reasons, bool((name or romanized) and (email or mobile))


def assign_links(cards, kind):
    """확정된 명함들(업로드 순)에 회사/인물 ID 를 붙인다. 사용자가 정한 연결(…Link)이 자동 판정보다 우선한다.
    반환: {card_id: (entity_id, reasons)}"""
    link_key = 'companyLink' if kind == 'company' else 'personLink'
    prefix = 'company' if kind == 'company' else 'contact'
    by_id = {c['id']: c for c in cards}
    result, assigned = {}, []

    def assign(card, path):
        if card['id'] in result or card['id'] in path:
            return
        choice = card.get(link_key)
        reference = by_id.get(choice) if choice and choice != 'separate' else None
        match = reference
        reasons = ['사용자가 별도 등록'] if choice == 'separate' else ['자동 연결에 충분한 근거가 없어 별도 등록']
        if reference:
            assign(reference, path | {card['id']})
            reasons = ['사용자가 연결을 확정', *match_evidence(card, reference, kind)[0]]
        elif not choice:
            found = []
            for other in assigned:
                if other.get(link_key) == 'separate':
                    continue
                why, strong = match_evidence(card, other, kind)
                if strong:
                    found.append((other, why))
            groups = {result[o['id']][0] for o, _ in found}
            if len(groups) == 1:
                match, reasons = found[0]
            elif len(groups) > 1:
                reasons = ['일치하는 대상이 여러 개여서 별도 등록']
        entity = result[match['id']][0] if match and match['id'] in result else f'{prefix}-{card["id"]}'
        result[card['id']] = (entity, reasons)
        assigned.append(card)

    for card in cards:
        assign(card, frozenset())
    return result


def confirmed_in_order(cards):
    return sorted((c for c in cards if c.get('status') == 'reviewed'), key=lambda c: (c['uploadedAt'], c['id']))
