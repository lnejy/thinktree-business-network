"""무작위 명함으로 서버(relational)와 프런트(cardApi.ts)의 결과가 같은지 비교한다. 사용: python parity.py <frontend 폴더> [시나리오 수]"""
import json, os, random, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from relational import RelationalStore

FRONT = sys.argv[1]
N = int(sys.argv[2]) if len(sys.argv) > 2 else 60
START = int(sys.argv[3]) if len(sys.argv) > 3 else 0    # 시작 시드: 같은 값이면 같은 시나리오가 다시 만들어진다
KEYS = ('fax', 'postalCode', 'address2', 'company', 'name', 'nameEn', 'branch', 'department', 'team', 'position', 'phone', 'mobile', 'email', 'address', 'website')
COMPANIES = [('테스트', 'test.example'), ('알파 시스템', 'alpha.example'), ('베타 솔루션', 'beta.example'), ('감마', 'gmail.com'), ('델타', 'delta.example')]
SUFFIX = ['', ' 주식회사', '(주)', ' Co., Ltd.', ' Inc.', ' LLC']
PEOPLE = [('김가람', 'Kim Garam', '010-1111-2222'), ('이나래', 'Lee Narae', '010-3333-4444'), ('박다온', 'Park Daon', ''), ('최라온', '', '010-5555-6666'), ('정마루', 'Jung Maru', '010-7777-8888')]
DEPTS = [('영업부', ''), ('기획부', '개발 1팀'), ('영업부', '지역본부 / 개발 1팀'), ('', ''), ('연구소', 'AI팀')]
BRANCH = ['서울 본사', '부산 지점', '', '서울 본사']


def make(seed):
    rnd = random.Random(seed)
    cards = []
    for i in range(rnd.randint(4, 14)):
        name, name_en, mobile = rnd.choice(PEOPLE)
        company, host = rnd.choice(COMPANIES)
        dept, team = rnd.choice(DEPTS)
        user = rnd.choice([(name_en.split() or ['x'])[0].lower(), 'info', 'sales', 'p' + str(rnd.randint(1, 3))])
        values = dict(company=company + rnd.choice(SUFFIX), name=name, nameEn=name_en, branch=rnd.choice(BRANCH), department=dept, team=team,
                      position=rnd.choice(['', '팀장', '대리']), mobile=rnd.choice([mobile, mobile.replace('-', ' '), '']),
                      email=rnd.choice([f'{user}@{host}', '']), website=rnd.choice([f'https://www.{host}', host, '']),
                      address=rnd.choice(['', '서울시 강남구 1', '서울시 강남구 2']), postalCode=rnd.choice(['', '06000']), phone='')
        card = dict(id=f'c{i:02d}', status='reviewed', ownerId=rnd.choice(['e1', 'e2', 'e3']),
                    uploadedAt=f'2026-0{rnd.randint(1, 9)}-1{rnd.randint(0, 9)}T0{rnd.randint(0, 9)}:00:00Z', reviewedAt='2026-11-01T00:00:00Z',
                    extracted={k: dict(value=values.get(k, ''), confidence='high') for k in KEYS})
        card['id'] = f'c{i:02d}-{rnd.randint(0, 99):02d}'
        if rnd.random() < 0.5:
            card['effectiveDate'] = rnd.choice(['2024-01-01', '2025-01-01', '2025-07-01', '2026-01-01'])
        if rnd.random() < 0.12:
            card['status'] = rnd.choice(['ready_for_review', 'reviewed'])
        cards.append(card)
    for card in cards:                                                    # 사용자가 정한 연결: 별도 등록 / 다른 명함 참조(없는 명함 포함)
        for key in ('personLink', 'companyLink'):
            r = rnd.random()
            if r < 0.08: card[key] = 'separate'
            elif r < 0.16: card[key] = rnd.choice(cards)['id']
            elif r < 0.18: card[key] = 'missing-card'
    return cards


def compare(seed, tmp):
    cards = make(seed)
    cards_json, out_json = tmp / 'cards.json', tmp / 'front.json'
    cards_json.write_text(json.dumps(cards), encoding='utf-8')
    subprocess.run(['node', str(Path(__file__).with_name('run_frontend.cjs')), str(cards_json), str(out_json)], check=True, cwd=FRONT,
                   env={**os.environ, 'FRONTEND_DIR': FRONT})
    front = json.loads(out_json.read_text(encoding='utf-8'))
    rel = RelationalStore(tmp / f'{seed}.sqlite3'); rel.rebuild(cards)
    problems = []
    with rel.connect() as db:
        mine = {r['id']: r for r in db.execute('SELECT * FROM card')}
        for cid, f in front['cards'].items():
            m = mine[cid]
            if (m['company_id'], m['person_id']) != (f['companyId'], f['contactId']): problems.append(('id', cid, (m['company_id'], m['person_id']), (f['companyId'], f['contactId'])))
            if json.loads(m['company_reasons']) != f['companyReasons']: problems.append(('companyReasons', cid))
            if json.loads(m['person_reasons']) != f['personReasons']: problems.append(('personReasons', cid))
    strip = lambda n: {k: v for k, v in n.items() if k in ('id', 'type', 'name', 'position', 'contactId', 'children')} | ({'children': [strip(c) for c in n.get('children', [])]} if 'children' in n else {})
    def clean(n):
        n = {k: v for k, v in n.items() if v is not None and v != ''}
        if 'children' in n: n['children'] = [clean(c) for c in n['children']]
        return n
    for key, tree in front['trees'].items():
        company_id, as_of = key.split('|')
        if clean(strip(tree)) != clean(strip(rel.org_tree(company_id, as_of))): problems.append(('tree', key))
    for pid, hist in front['history'].items():
        mine_hist = [(h['id'], [c['label'] for c in h['changes']]) for h in rel.person_history(pid)]
        if mine_hist != [(h['id'], h['changes']) for h in hist]: problems.append(('history', pid))
        if sorted([s['card']['id'], s['company'], s['date']] for s in rel.shared_affiliations(pid)) != front['shared'][pid]: problems.append(('shared', pid))
    for as_of, pairs in front['current'].items():
        if sorted([c['personId'], c['id']] for c in rel.current_affiliations(as_of)) != pairs: problems.append(('current', as_of))
    for c in front['companies']:
        m = next(x for x in rel.companies() if x['id'] == c['id'])
        if (m['contactCount'], m['cardCount'], m['departmentCount'], m['connectedEmployeeCount']) != (c['contactCount'], c['cardCount'], c['departmentCount'], c['connectedEmployeeCount']): problems.append(('company-counts', c['id'], m, c))
    return problems


if __name__ == '__main__':
    bad = 0
    with tempfile.TemporaryDirectory() as t:
        print(f'시드 {START}~{START + N - 1} (다시 돌리려면: python parity/parity.py <프런트 폴더> {N} {START})')
        for seed in range(START, START + N):
            problems = compare(seed, Path(t))
            if problems:
                bad += 1
                print(f'seed {seed}: {len(problems)}건 불일치', problems[:3])
    print(f'시나리오 {N}개 중 {N - bad}개 일치' + ('' if not bad else f', {bad}개 불일치'))
    sys.exit(1 if bad else 0)
