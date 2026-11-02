"""Offline contract tests; no model download or external API calls."""
import copy
import io
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image

import api
from card_service import Pipeline, Store, local_fields, map_structured


class CardApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Store(self.temp.name)
        self.pipeline = Pipeline(self.store)
        self.patches = [patch.object(api, 'store', self.store), patch.object(api, 'pipeline', self.pipeline),
                        patch.object(self.pipeline, 'submit')]
        for p in self.patches:
            p.start()
        self.client = TestClient(api.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        for p in reversed(self.patches):
            p.stop()
        self.temp.cleanup()

    def sample(self):
        response = self.client.post('/api/samples/sample1?ownerId=e2')
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
        self.assertEqual(Store(self.temp.name).get(card['id'])['extracted']['company']['value'], '테스트 주식회사')
        self.assertEqual(self.client.delete(f'/api/cards/{card["id"]}').status_code, 409)

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


if __name__ == '__main__':
    unittest.main()
