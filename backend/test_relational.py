"""frontend/test-data.cjs 의 판별·조직도·이력 시나리오를 서버 쪽(relational)에서 그대로 확인한다.   실행: python test_relational.py"""
import copy
import tempfile
import unittest
from pathlib import Path

from relational import RelationalStore
from relational.resolver import match_evidence


def card(n, department, company='테스트 회사', domain='example.test', **extra):
    fields = dict(company=company, name=f'담당자{n}', email=f'person{n}@{domain}', branch='서울 본사', department=department, team='개발 1팀')
    keys = ('fax', 'postalCode', 'address2', 'company', 'name', 'nameEn', 'branch', 'department', 'team', 'position',
            'phone', 'mobile', 'email', 'address', 'website')
    c = dict(id=str(n), status='reviewed', ownerId='e1', uploadedAt=f'2026-11-02T00:00:{int(n):02d}Z', reviewedAt='2026-11-03T00:00:00Z',
             extracted={k: dict(value=fields.get(k, ''), confidence='high') for k in keys})
    c.update(extra)
    return c


def setv(c, **values):
    for k, v in values.items():
        c['extracted'][k]['value'] = v
    return c


class RelationalTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.rel = RelationalStore(Path(self.dir.name) / 'relational.sqlite3')

    def tearDown(self):
        self.dir.cleanup()

    def ids(self, cards, kind='companyId'):
        with self.rel.connect() as db:
            column = 'company_id' if kind == 'companyId' else 'person_id'
            return {r['id']: r[column] for r in db.execute('SELECT id, company_id, person_id FROM card')}

    def test_company_merge_and_tree(self):
        a, b = card(1, '영업부'), card(2, '기획부')
        self.rel.rebuild([a, b])
        companies = self.rel.companies()
        self.assertEqual(len(companies), 1)
        ids = self.ids([a, b])
        self.assertEqual(ids['1'], ids['2'])
        tree = self.rel.org_tree(ids['1'])
        branch = tree['children'][0]
        self.assertEqual(branch['type'], 'head_office')
        self.assertEqual(len(branch['children']), 2)
        self.assertNotEqual(branch['children'][0]['children'][0]['id'], branch['children'][1]['children'][0]['id'])
        self.assertEqual(companies[0]['contactCount'], 2)
        self.rel.rebuild([a, b])                                   # 다시 만들어도 중복되지 않는다
        self.assertEqual(len(self.rel.companies()), 1)
        with self.rel.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM connection').fetchone()[0], 2)

    def test_domain_isolation(self):
        a, c, d = card(1, '영업부'), card(3, '영업부', '별도 회사', 'example.test'), card(4, '영업부', '테스트 회사', 'different.test')
        e, f = card(5, '영업부', '테스트 회사', 'gmail.com'), card(6, '영업부', '별도 회사', 'gmail.com')
        self.rel.rebuild([a, c])
        ids = self.ids([a, c]); self.assertNotEqual(ids['1'], ids['3'], 'domain alone is insufficient')
        self.rel.rebuild([a, d])
        ids = self.ids([a, d]); self.assertNotEqual(ids['1'], ids['4'], 'conflicting domains must not merge')
        self.rel.rebuild([e, f])
        ids = self.ids([e, f]); self.assertNotEqual(ids['5'], ids['6'], 'free email domain must not merge companies')

    def test_full_department_path(self):
        a = card(1, '영업부', departmentPath=['영업부', '지역본부', '개발 1팀'])
        setv(a, team='지역본부 / 개발 1팀')
        self.rel.rebuild([a])
        tree = self.rel.org_tree(self.ids([a])['1'])
        self.assertEqual(tree['children'][0]['children'][0]['children'][0]['name'], '지역본부')

    def history_cards(self):
        old, recent = card(7, '개발팀', 'A 연구소', 'a.test'), card(8, '연구팀', 'B 연구소', 'b.test')
        peer, namesake = card(9, '개발팀', 'A 연구소', 'a.test'), card(10, '개발팀', 'A 연구소', 'a.test')
        for c in (old, recent, namesake):
            setv(c, name='김가람')
        setv(old, mobile='010-1234-5678'); setv(recent, mobile='+82 10 1234 5678')
        old['effectiveDate'], recent['effectiveDate'] = '2024-01-01', '2026-01-01'
        peer['effectiveDate'] = namesake['effectiveDate'] = '2025-01-01'
        return old, recent, peer, namesake

    def test_transfer_history_and_as_of(self):
        old, recent, peer, namesake = self.history_cards()
        self.rel.rebuild([recent, old, peer, namesake])
        pid = lambda c: person_ids[c['id']]
        person_ids = self.ids([old, recent, peer, namesake], 'personId')
        self.assertEqual(pid(recent), pid(old), 'mobile and name survive a transfer')
        self.assertNotEqual(pid(old), pid(namesake), 'namesakes need additional evidence')
        history = self.rel.person_history(pid(old))
        self.assertEqual(history[0]['id'], recent['id'])
        self.assertTrue(any(ch['label'] == '회사명' for ch in history[0]['changes']))
        self.assertEqual(history[0]['dateConfirmed'], True)
        now = {c['personId']: c['id'] for c in self.rel.current_affiliations('2025-12-31')}
        self.assertEqual(now[pid(old)], old['id'])
        now = {c['personId']: c['id'] for c in self.rel.current_affiliations('2026-01-01')}
        self.assertEqual(now[pid(old)], recent['id'])
        shared = self.rel.shared_affiliations(pid(old))
        self.assertTrue(any(s['card']['id'] == peer['id'] and s['date'] == '2025-01-01' for s in shared))
        # 과거 시점 조직도: 2025-12-31 에는 A 연구소에, 2026-01-01 에는 B 연구소에 있다.
        company_of = self.ids([old, recent])
        def names(node):
            if not node:
                return []
            return [node['contactId']] if node['type'] == 'person' else [n for c in node.get('children', []) for n in names(c)]
        self.assertIn(pid(old), names(self.rel.org_tree(company_of[old['id']], '2025-12-31')))
        self.assertNotIn(pid(old), names(self.rel.org_tree(company_of[old['id']], '2026-01-01')))   # 이름이 같은 다른 사람(namesake)은 남아 있다
        self.assertIn(pid(old), names(self.rel.org_tree(company_of[recent['id']], '2026-01-01')))

    def test_labeled_identity_scenarios(self):
        a, b, c, d = card(1, '영업부'), card(2, '기획부'), card(3, '영업부', '별도 회사'), card(4, '영업부', '테스트 회사', 'different.test')
        e, f = card(5, '영업부', '테스트 회사', 'gmail.com'), card(6, '영업부', '별도 회사', 'gmail.com')
        old, recent, peer, namesake = self.history_cards()
        alias = card(11, '개발팀', 'A 연구소 주식회사', 'a.test')
        mailbox = copy.deepcopy(old); setv(mailbox, mobile='', email='sales@a.test')
        pairs = [(old, recent, 'person', True), (old, namesake, 'person', False), (mailbox, copy.deepcopy(mailbox), 'person', False),
                 (old, alias, 'company', True), (a, b, 'company', True), (a, c, 'company', False), (a, d, 'company', False),
                 (e, f, 'company', False), (old, peer, 'company', True), (old, recent, 'company', False)]
        wrong = [(x['id'], y['id'], kind) for x, y, kind, expected in pairs if match_evidence(x, y, kind)[1] != expected]
        self.assertEqual(wrong, [], 'automatic linking must match labeled scenarios')

    def test_user_separation_and_link(self):
        old, recent, peer, namesake = self.history_cards()
        self.rel.rebuild([recent, old, peer, namesake])
        ids = self.ids([old, recent], 'personId'); self.assertEqual(ids[recent['id']], ids[old['id']])
        old['personLink'] = 'separate'
        self.rel.rebuild([recent, old, peer, namesake])
        ids = self.ids([old, recent], 'personId'); self.assertNotEqual(ids[recent['id']], ids[old['id']], 'separated reference does not attract automatic links')
        namesake['personLink'] = old['id']                            # 사용자가 이름만 같은 사람을 같은 사람으로 확정
        self.rel.rebuild([recent, old, peer, namesake])
        ids = self.ids([old, namesake], 'personId'); self.assertEqual(ids[old['id']], ids[namesake['id']])
        with self.rel.connect() as db:
            import json
            reasons = json.loads(db.execute('SELECT person_reasons FROM card WHERE id=?', (namesake['id'],)).fetchone()[0])
        self.assertEqual(reasons[0], '사용자가 연결을 확정')

    def test_only_reviewed_cards_and_empty(self):
        draft = card(1, '영업부'); draft['status'] = 'ready_for_review'
        self.rel.rebuild([draft])
        self.assertEqual(self.rel.companies(), [])
        self.assertIsNone(self.rel.org_tree('company-none'))
        self.rel.rebuild([])
        self.assertEqual(self.rel.current_affiliations(), [])

    def test_company_name_normalization(self):
        a, b = card(1, '영업부', '(주)콤즈', 'colmes.test'), card(2, '영업부', '유한회사 콤즈', 'colmes.test')
        self.rel.rebuild([a, b])
        self.assertEqual(len(self.rel.companies()), 1, '팀장님 정규화: (주)콤즈 == 유한회사 콤즈')

    def test_failed_rebuild_keeps_last_result(self):
        a, b = card(1, '영업부'), card(2, '기획부')
        self.rel.rebuild([a, b])
        before = self.rel.companies()
        self.assertEqual(before[0]['cardCount'], 2)
        original = self.rel._populate
        def broken(db, *args):
            original(db, *args)
            raise RuntimeError('rebuild failed halfway')
        self.rel._populate = broken
        with self.assertRaises(RuntimeError):
            self.rel.rebuild([a])
        self.rel._populate = original
        self.assertEqual(self.rel.companies(), before, '실패하면 마지막 성공 결과를 그대로 조회한다')
        self.assertFalse(self.rel.path.with_name(self.rel.path.name + '.tmp').exists())

    def test_fresh_store_is_queryable_before_first_rebuild(self):
        import tempfile
        from pathlib import Path
        from relational import RelationalStore
        with tempfile.TemporaryDirectory() as t:
            self.assertEqual(RelationalStore(Path(t) / 'new.sqlite3').companies(), [])


if __name__ == '__main__':
    unittest.main()
