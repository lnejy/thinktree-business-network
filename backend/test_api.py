"""Offline contract tests; no model download or external API calls."""
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

import api
from accounts import Accounts, distribute_legacy_cards
from card_service import Pipeline, Store, local_fields, map_structured
from evaluation_import import import_evaluation, ocr_fingerprint


class CardApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.pipeline = Pipeline(self.store)
        self.patches = [patch.object(api, 'store', self.store), patch.object(api, 'pipeline', self.pipeline),
                        patch.object(self.pipeline, 'submit'), patch.object(api, 'import_evaluation')]
        for p in self.patches:
            p.start()
        self.client = TestClient(api.app)
        self.client.__enter__()
        self.access = json.loads(Accounts(self.store).bootstrap_path.read_text(encoding='utf-8'))
        self.login('beomchang')

    def tearDown(self):
        self.client.__exit__(None, None, None)
        for p in reversed(self.patches):
            p.stop()
        self.temp.cleanup()

    def login(self, username, client=None):
        client = client or self.client
        account = next(item for item in self.access['accounts'] if item['username'] == username)
        response = client.post('/api/auth/login', json={'username': username, 'password': account['password']})
        self.assertEqual(response.status_code, 200)
        return response.json()

    def sample(self):
        response = self.client.post('/api/samples/sample1')
        self.assertEqual(response.status_code, 201)
        return response.json()

    def test_sample_draft_confirm_and_persistence(self):
        card = self.sample()
        self.assertEqual(card['source'], 'sample')
        self.assertEqual(card['ownerId'], 'e2')
        self.assertEqual(self.client.get(card['imageUrl']).status_code, 200)
        fields = card['extracted']
        url = f'/api/cards/{card["id"]}/review'
        self.assertEqual(self.client.put(url, json={'extracted': fields, 'action': 'confirm'}).status_code, 422)
        fields['company']['value'] = '테스트 주식회사'
        fields['fax']['value'] = '02-123-4567'
        response = self.client.put(url, json={'extracted': fields, 'action': 'draft'})
        self.assertEqual(response.json()['status'], 'ready_for_review')
        response = self.client.put(url, json={'extracted': fields, 'action': 'confirm'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'reviewed')
        invalid = copy.deepcopy(fields)
        invalid['company']['value'] = ''
        self.assertEqual(self.client.put(url, json={'extracted': invalid, 'action': 'draft'}).status_code, 422)
        self.assertEqual(Store(self.temp.name).get(card['id'])['extracted']['company']['value'], '테스트 주식회사')
        self.assertEqual(self.client.delete(f'/api/cards/{card["id"]}').status_code, 409)

    def test_signup_sessions_and_card_access(self):
        other = TestClient(api.app)
        self.assertEqual(other.get('/api/cards').status_code, 401)
        self.assertEqual(other.post('/api/auth/login', json={'username': 'beomchang', 'password': 'invalid'}).status_code, 401)
        signup = dict(username='test-member', name='테스트 팀원', password='safe-demo-password', inviteCode='invalid')
        self.assertEqual(other.post('/api/auth/signup', json=signup).status_code, 403)
        signup['inviteCode'] = self.access['inviteCode']
        response = other.post('/api/auth/signup', json=signup)
        self.assertEqual(response.status_code, 201)
        self.assertIn('HttpOnly', response.headers['set-cookie'])
        recipient = response.json()['user']
        self.assertEqual(other.get('/api/auth/me').json()['user'], recipient)
        self.assertEqual(other.post('/api/evaluation/import').status_code, 403)
        self.assertEqual(other.post('/api/auth/signup', json=signup).status_code, 409)
        card = self.sample()
        card_url = f'/api/cards/{card["id"]}'
        self.assertEqual(other.get('/api/cards').json(), [])
        self.assertEqual(other.get(card['imageUrl']).status_code, 403)
        self.assertEqual(other.delete(card_url).status_code, 403)
        card['extracted']['company']['value'] = 'Sample Company'
        review = {'action': 'confirm', 'extracted': card['extracted']}
        self.assertEqual(self.client.put(f'{card_url}/review', json=review).status_code, 200)
        self.assertEqual(other.get(card_url).status_code, 200)
        self.assertEqual(other.put(f'{card_url}/review', json=review).status_code, 403)
        self.assertEqual(self.client.put(f'{card_url}/owners', json={'ownerIds': ['unknown']}).status_code, 422)
        shared = self.client.put(f'{card_url}/owners', json={'ownerIds': [recipient['id'], recipient['id']]})
        self.assertEqual(shared.json()['ownerIds'], ['e2', recipient['id']])
        self.assertEqual(other.put(f'{card_url}/review', json=review).status_code, 200)
        self.assertEqual(other.post('/api/auth/logout').status_code, 204)
        self.assertEqual(other.get(card['imageUrl']).status_code, 401)

    def test_existing_card_distribution_is_idempotent(self):
        statuses = ['reviewed', *['ready_for_review'] * 10]
        for index, status in enumerate(statuses):
            self.store.put({'id': f'legacy-{index}', 'status': status, 'ownerId': 'e1', 'originalUrl': 'preserved'})
        distribute_legacy_cards(self.store)
        migrated = self.store.all()
        self.assertEqual({card['ownerId'] for card in migrated}, {f'e{x}' for x in range(1, 6)})
        self.assertEqual(self.store.get('legacy-0')['ownerIds'], [f'e{x}' for x in range(1, 6)])
        self.assertTrue(all(card['originalUrl'] == 'preserved' for card in migrated))
        distribute_legacy_cards(self.store)
        self.assertEqual(self.store.all(), migrated)

    def test_invalid_images_and_options(self):
        self.assertEqual(self.client.post('/api/cards', files={'file': ('bad.png', b'not image', 'image/png')}).status_code, 400)
        self.assertEqual(self.client.post('/api/cards', files={'file': ('bad.png', b'x' * (api.MAX_BYTES + 1))}).status_code, 413)
        self.assertEqual(self.client.post('/api/cards', data={'engine': 'bad'}, files={'file': ('x.png', b'x')}).status_code, 422)
        self.assertEqual(self.store.all(), [])

    def test_upload_processing_retry_and_reject(self):
        content = io.BytesIO()
        Image.new('RGB', (400, 240), 'white').save(content, 'PNG')
        response = self.client.post('/api/cards', files={'file': ('../../escape.png', content.getvalue(), 'image/png')}, data={'language': 'ja'})
        self.assertEqual(response.status_code, 202)
        card = response.json()
        self.assertTrue((self.store.images / f'{card["id"]}.png').is_file())
        self.assertEqual(card['requestedLanguage'], 'ja')
        self.assertEqual(self.client.post(f'/api/cards/{card["id"]}/retry').status_code, 409)
        with patch.object(self.pipeline, 'recognize', side_effect=ValueError('인식된 글자가 없습니다.')):
            self.pipeline.process(card['id'])
        self.assertEqual(self.store.get(card['id'])['status'], 'failed')
        self.assertEqual(self.client.post(f'/api/cards/{card["id"]}/retry').status_code, 202)
        with patch.object(self.pipeline, 'recognize', return_value=dict(lines=['Company: Example', 'Name: Test', 'a@example.com'], avg_score=0.9, language='en')):
            self.pipeline.process(card['id'])
        final = self.store.get(card['id'])
        self.assertEqual(final['status'], 'ready_for_review')
        self.assertEqual(final['extracted']['name']['value'], 'Test')
        self.assertEqual(self.client.delete(f'/api/cards/{card["id"]}').status_code, 204)
        self.assertFalse((self.store.images / f'{card["id"]}.png').exists())
        self.assertEqual(self.client.get(f'/api/cards/{card["id"]}').status_code, 404)

    def test_restart_marks_interrupted_processing(self):
        card = self.store.create('e1', 'local', 'auto')
        with TestClient(api.app):
            self.assertEqual(self.store.get(card['id'])['status'], 'failed')

    def test_no_hallucinated_names(self):
        result = map_structured(local_fields(['Some slogan', 'hello@example.com', '010-1234-5678']))
        self.assertEqual(result['name']['value'], '')
        self.assertEqual(result['company']['value'], '')
        self.assertEqual(result['email']['value'], 'hello@example.com')
        self.assertEqual(result['mobile']['value'], '010-1234-5678')

    def test_review_dates_and_explicit_link_split(self):
        cards = [self.sample() for _ in range(3)]
        def review(card, **options):
            card['extracted']['company']['value'] = 'Example'
            card['extracted']['name']['value'] = 'Example Person'
            return self.client.put(f'/api/cards/{card["id"]}/review', json=dict(extracted=card['extracted'], action='confirm', **options))
        first, second, third = cards
        self.assertEqual(review(first, effectiveDate='2024-01-01').status_code, 200)
        self.assertEqual(review(second, personLink=first['id']).status_code, 200)
        self.assertEqual(review(third, personLink=first['id']).status_code, 200)
        self.assertEqual(review(first, personLink=third['id']).status_code, 422)
        self.assertEqual(review(first, personLink='separate').status_code, 200)
        self.assertEqual(self.store.get(first['id'])['effectiveDate'], '2024-01-01')
        remaining = [self.store.get(card['id']) for card in (second, third)]
        self.assertEqual(sum(card.get('personLink') is None for card in remaining), 1)
        self.assertTrue(any(card.get('personLink') in (second['id'], third['id']) for card in remaining))

    def test_external_failure_preserves_ocr(self):
        card = self.store.create('e1', 'gemini', 'auto')
        with patch.object(self.pipeline, 'recognize', return_value=dict(lines=['Name: Test', 'Company: Example'], avg_score=0.95, language='en')), \
             patch('ocr_extract.GeminiEngine.extract', side_effect=RuntimeError('simulated provider failure')), \
             patch('ocr_extract.GeminiEngine.__init__', return_value=None), \
             patch('ocr_extract.encode_image', return_value=b'fake'):
            self.pipeline.process(card['id'])
        result = self.store.get(card['id'])
        self.assertEqual(result['status'], 'ready_for_review')
        self.assertEqual(result['extracted']['company']['value'], 'Example')
        self.assertIn('Name: Test', result['ocrRawText'])
        self.assertTrue(any('외부 AI' in w for w in result['warnings']))

    def test_saved_evaluation_import_original_results_and_idempotence(self):
        self.login('jaeyeon')
        source = Path(self.temp.name) / 'source'
        for folder in ('cards', 'out', 'out/images', 'gt'):
            (source / folder).mkdir(parents=True, exist_ok=True)
        name = '명함 테스트 (1)'
        original = source / 'cards' / f'{name}.jpg'
        Image.new('RGB', (100, 60), 'white').save(original, 'JPEG')
        Image.new('RGB', (100, 60), 'blue').save(source / 'out/images' / f'{name}_ocr_res_img.png')
        lines = ['Company: Example', 'Name: Test', 'hello@example.com']
        payload = dict(lines=lines, language='en', avg_score=0.9, chosen_model='korean',
                       raw={'korean': {'texts': lines, 'scores': [0.9, 0.8, 1.0]},
                            'default': {'texts': lines, 'scores': [0.7, 0.8, 0.9]}})
        (source / 'out' / f'{name}.json').write_text(json.dumps(payload), encoding='utf-8')
        (source / 'gt' / f'{name}.txt').write_text('\n'.join(lines), encoding='utf-8')
        result = import_evaluation(self.store, source)
        self.assertEqual(result['imported'], 1)
        card = self.store.all()[0]
        self.assertEqual(card['source'], 'evaluation')
        self.assertEqual(card['sourceFileName'], original.name)
        self.assertEqual(card['extracted']['company']['value'], 'Example')
        self.assertEqual(card['evaluation']['coverage'], 100.0)
        self.assertEqual(card['evaluation']['accuracy'], 100.0)
        self.assertEqual(card['evaluation']['models'][0]['confidence'], 90.0)
        self.assertEqual(self.client.get(card['originalUrl']).content, original.read_bytes())
        self.assertEqual(self.client.get(card['visualizationUrl']).status_code, 200)
        self.assertEqual(self.client.get(card['imageUrl']).status_code, 200)
        card['extracted']['company']['value'] = 'User edit'
        self.client.put(f'/api/cards/{card["id"]}/review', json={'extracted': card['extracted'], 'action': 'draft'})
        self.assertEqual(import_evaluation(self.store, source)['existing'], 1)
        self.assertEqual(self.store.get(card['id'])['extracted']['company']['value'], 'User edit')
        self.assertEqual(len(self.store.all()), 1)
        self.assertEqual(self.client.delete(f'/api/cards/{card["id"]}').status_code, 204)
        self.assertEqual(import_evaluation(self.store, source)['imported'], 0)
        self.assertEqual(self.store.all(), [])

    def test_saved_evaluation_without_ground_truth(self):
        source = Path(self.temp.name) / 'source'
        (source / 'cards').mkdir(parents=True)
        (source / 'out').mkdir()
        Image.new('RGB', (100, 60), 'white').save(source / 'cards' / 'test.png')
        (source / 'out/test.json').write_text(json.dumps(dict(lines=['Test'], avg_score=0.5)), encoding='utf-8')
        self.assertEqual(import_evaluation(self.store, source)['imported'], 1)
        report = self.store.all()[0]['evaluation']
        self.assertFalse(report['hasGroundTruth'])
        self.assertIsNone(report['coverage'])

    def test_saved_summary_metrics_work_without_private_ground_truth(self):
        source = Path(self.temp.name) / 'source'
        (source / 'cards').mkdir(parents=True)
        (source / 'out').mkdir()
        payload = dict(lines=['Test'], avg_score=0.5)
        metrics = {}
        for name, digest in [('valid', ocr_fingerprint(payload)), ('stale', 'incorrect-hash')]:
            Image.new('RGB', (100, 60), 'white').save(source / 'cards' / f'{name}.png')
            (source / 'out' / f'{name}.json').write_text(json.dumps(payload, indent=4) + '\r\n', encoding='utf-8')
            metrics[f'{name}.png'] = dict(ocrSha256=digest, report=dict(coverage=0.75, accuracy=0.8, recall=0.9))
        (source / 'evaluation_metrics.json').write_text(json.dumps(metrics), encoding='utf-8')
        self.assertEqual(import_evaluation(self.store, source)['imported'], 2)
        results = {c['sourceFileName']: c['evaluation'] for c in self.store.all()}
        self.assertEqual(results['valid.png']['coverage'], 75.0)
        self.assertEqual(results['valid.png']['accuracy'], 80.0)
        self.assertFalse(results['stale.png']['hasGroundTruth'])


if __name__ == '__main__':
    unittest.main()
