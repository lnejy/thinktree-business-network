"""relational.sqlite3 조회. cardApi.ts 의 currentAffiliations / companyTree / personHistory / sharedAffiliations / affiliationChanges 와 같은 규칙이다."""
import json
from urllib.parse import quote

OPEN_END = '9999-12-31'
TRACKED = {'company': '회사명', 'branch': '본사·지점', 'department': '부서', 'team': '팀', 'position': '직책',
           'phone': '전화번호', 'mobile': '휴대전화', 'email': '이메일', 'address': '주소', 'postalCode': '우편번호'}
NO_SITE = '사업소 미확인'


def _card(row):
    return dict(id=row['id'], personId=row['person_id'], companyId=row['company_id'], ownerId=row['owner_id'],
                effectiveDate=row['effective_date'], cardDate=row['card_date'], dateConfirmed=row['effective_date'] is not None,
                uploadedAt=row['uploaded_at'], reviewedAt=row['reviewed_at'],
                personLink=row['person_link'], companyLink=row['company_link'],
                personReasons=json.loads(row['person_reasons']), companyReasons=json.loads(row['company_reasons']),
                fields=json.loads(row['fields']), departmentPath=json.loads(row['department_path']),
                siteId=row['site_id'], departmentId=row['department_id'])


def _newest(cards):
    return sorted(cards, key=lambda c: (c['cardDate'], c['dateConfirmed'], c['uploadedAt'], c['id']), reverse=True)


def _all_cards(db):
    return [_card(r) for r in db.execute('SELECT * FROM card ORDER BY rowid')]


def companies(db):
    out = []
    for c in db.execute('SELECT * FROM company ORDER BY rowid'):
        people = db.execute('SELECT department, team, owner_ids FROM person WHERE company_id=?', (c['id'],)).fetchall()
        out.append(dict(
            id=c['id'], name=c['name'], nameEn=c['name'], domain=c['domain'] or '', address=c['address'] or '',
            registrationNo=c['registration_no'], industry='',
            contactCount=len(people),
            cardCount=db.execute('SELECT COUNT(*) FROM card WHERE company_id=?', (c['id'],)).fetchone()[0],
            departmentCount=len({(p['department'], p['team']) for p in people if p['department'] or p['team']}),
            connectedEmployeeCount=len({o for p in people for o in json.loads(p['owner_ids'])})))
    return out


def current_affiliations(db, as_of=None):
    """사람마다 as_of 날짜 이전(포함)의 가장 최근 명함 한 장."""
    as_of = as_of or OPEN_END
    latest = {}
    for card in _newest(_all_cards(db)):
        if card['cardDate'] <= as_of and card['personId'] not in latest:
            latest[card['personId']] = card
    return list(latest.values())


def org_tree(db, company_id, as_of=None):
    """회사 › 사업소 › 부서(상위→하위) › 사람. 사람은 as_of 시점의 현재 소속 회사에만 나타난다. 회사가 없으면 None."""
    company = db.execute('SELECT * FROM company WHERE id=?', (company_id,)).fetchone()
    if not company:
        return None
    sites = {r['id']: r for r in db.execute('SELECT * FROM site WHERE company_id=?', (company_id,))}
    departments = {r['id']: r for r in db.execute('SELECT * FROM department')}
    root = dict(id=company_id, type='company', name=company['name'], children=[])
    nodes, placed = {company_id: root}, set()
    for card in current_affiliations(db, as_of):
        if card['companyId'] != company_id:
            continue
        chain, node_id = [], card['departmentId'] or card['siteId']
        while node_id in departments or node_id in sites:
            if node_id in departments:
                row = departments[node_id]
                chain.append((node_id, 'department', row['name']))
                node_id = row['parent_id'] or row['site_id']
            else:
                chain.append((node_id, 'head_office', sites[node_id]['name']))
                break
        parent = root
        for node_id, kind, name in reversed(chain):
            if node_id not in nodes:
                nodes[node_id] = dict(id=node_id, type=kind, name=name, children=[])
                parent['children'].append(nodes[node_id])
            parent = nodes[node_id]
        person_node = f'{parent["id"]}/{card["personId"]}'
        if person_node not in placed:
            parent['children'].append(dict(id=person_node, type='person', name=card['fields']['name'],
                                           position=card['fields']['position'], contactId=card['personId']))
            placed.add(person_node)
    return root


def affiliation_changes(card, earlier):
    if not earlier:
        return []
    return [dict(label=label, **{'from': earlier['fields'][k], 'to': card['fields'][k]})
            for k, label in TRACKED.items() if earlier['fields'][k] != card['fields'][k]]


def person_history(db, person_id):
    """사람의 명함을 최신순으로. 각 항목에 바로 이전(더 오래된) 명함과 달라진 항목(changes)을 붙인다."""
    cards = _newest([c for c in _all_cards(db) if c['personId'] == person_id])
    return [dict(card, changes=affiliation_changes(card, cards[i + 1] if i + 1 < len(cards) else None))
            for i, card in enumerate(cards)]


def shared_affiliations(db, person_id):
    """이 사람과 같은 회사에 겹치는 기간 동안 소속됐던 다른 사람."""
    everyone = _all_cards(db)
    history = _newest([c for c in everyone if c['personId'] == person_id])
    peers, seen = [], set()
    for index, card in enumerate(history):
        start = card['cardDate']
        end = history[index - 1]['cardDate'] if index else OPEN_END
        if start >= end:
            continue
        candidates = list(dict.fromkeys(o['personId'] for o in everyone
                                        if o['personId'] != person_id and o['companyId'] == card['companyId']))
        for other_id in candidates:
            peer_history = _newest([c for c in everyone if c['personId'] == other_id])
            overlap = None
            for peer_index, other in enumerate(peer_history):
                peer_start = other['cardDate']
                peer_end = peer_history[peer_index - 1]['cardDate'] if peer_index else OPEN_END
                if other['companyId'] == card['companyId'] and peer_start < peer_end and peer_start < end and start < peer_end:
                    overlap = other
                    break
            if overlap and (other_id, card['companyId']) not in seen:
                seen.add((other_id, card['companyId']))
                peers.append(dict(card=overlap, company=card['fields']['company'], date=max(start, overlap['cardDate'])))
    return peers
