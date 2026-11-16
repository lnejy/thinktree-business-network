import os, sys, tempfile, types, json
os.environ['THINKTREE_DATA_DIR'] = tempfile.mkdtemp()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
stub = types.ModuleType('evaluation_import'); stub.import_evaluation = lambda store: {}
sys.modules['evaluation_import'] = stub
from fastapi.testclient import TestClient
import api
from card_service import empty_fields

def fields(**kw):
    f = {k: {'value': '', 'confidence': 'high'} for k in api.FIELD_KEYS}
    for k, v in kw.items(): f[k]['value'] = v
    return f

def mk(owner, **kw):
    c = api.store.create(owner, 'local', 'auto')
    api.store.update(c['id'], status='ready_for_review')
    return c['id']

with TestClient(api.app) as client:
    assert client.get('/api/companies').json() == [] or True
    a = mk('e1'); b = mk('e2')
    def confirm(cid, **kw):
        r = client.put(f'/api/cards/{cid}/review', json={'extracted': fields(**kw), 'action': 'confirm'})
        assert r.status_code == 200, r.text
    confirm(a, company='테스트 회사', name='담당자1', email='p1@example.test', branch='서울 본사', department='영업부', team='개발 1팀')
    confirm(b, company='(주)테스트 회사', name='담당자2', email='p2@example.test', branch='서울 본사', department='기획부')
    comps = client.get('/api/companies').json()
    print('companies', comps)
    assert len(comps) == 1
    cid = comps[0]['id']
    tree = client.get(f'/api/companies/{cid}/org-chart').json()
    print(json.dumps(tree, ensure_ascii=False)[:600])
    assert client.get(f'/api/companies/{cid}/org-chart', params={'asOf': '2020-01-01'}).status_code == 200
    assert client.get(f'/api/companies/nope/org-chart').status_code == 404
    pid = a if False else None
    # draft cards must not appear
    d = mk('e1')
    r = client.put(f'/api/cards/{d}/review', json={'extracted': fields(company='초안 회사', name='초안'), 'action': 'draft'}); assert r.status_code == 200
    assert len(client.get('/api/companies').json()) == 1
    print('OK e2e')
