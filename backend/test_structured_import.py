import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from card_service import Store, map_structured
from structured_import import import_structured


class StructuredImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.store = Store(self.root / 'runtime')
        self.source = self.root / 'data.jsonl'
        self.row = dict(path='C:\\input\\2030-test.jpg', folder='한국', model='saved-model',
                        fields=dict(company=dict(name='Example'), site={}, departments=['개발부', '연구팀'],
                                    person=dict(name='담당자', email='person@example.test'), extra={}),
                        warnings=[], domain='example.test')
        self.write([self.row])

    def write(self, rows):
        self.source.write_text('\n'.join(json.dumps(r, ensure_ascii=False) for r in rows), encoding='utf-8')

    def test_match_existing_and_preserve_user_edits(self):
        card = self.store.create('e3', 'local', 'auto')
        old = dict(company=dict(name='Old'), site={}, person=dict(name='Before'), extra={}, departments=[])
        extracted = map_structured(old)
        extracted['name']['value'] = '사용자가 고친 이름'
        self.store.update(card['id'], status='ready_for_review', sourceFileName='2030-test(별칭).jpg',
                          extracted=extracted, structured=old)
        result = import_structured(self.store, self.source)
        self.assertEqual(result['updated'], 1)
        saved = self.store.get(card['id'])
        self.assertEqual(saved['extracted']['name']['value'], '사용자가 고친 이름')
        self.assertEqual(saved['extracted']['company']['value'], 'Example')
        self.assertEqual(saved['ownerIds'], ['e3'])
        self.assertEqual(import_structured(self.store, self.source)['unchanged'], 1)
        self.store.update(card['id'], status='reviewed')
        self.row['fields']['company']['name'] = 'Changed source'
        self.write([self.row])
        self.assertEqual(import_structured(self.store, self.source)['preservedConfirmed'], 1)
        self.assertEqual(self.store.get(card['id'])['extracted']['company']['value'], 'Example')

    def test_text_only_later_image_and_removed_record(self):
        self.assertEqual(import_structured(self.store, self.source)['withoutImage'], 1)
        images = self.root / 'originals'
        images.mkdir()
        Image.new('RGB', (100, 60), 'white').save(images / '2030-test.jpg')
        self.assertEqual(import_structured(self.store, self.source, [images])['withImage'], 1)
        saved = self.store.all()[0]
        self.assertTrue((self.store.originals / (saved['id'] + '.jpg')).exists())
        self.assertEqual(len(self.store.all()), 1)
        with self.store.connect() as db:
            db.execute('DELETE FROM cards WHERE id=?', (saved['id'],))
        self.assertEqual(import_structured(self.store, self.source)['previouslyRemoved'], 1)
        self.assertEqual(self.store.all(), [])

    def test_malformed_batch_changes_no_cards(self):
        self.write([self.row, dict(path='bad', fields={})])
        with self.assertRaises(ValueError):
            import_structured(self.store, self.source)
        self.assertEqual(self.store.all(), [])


if __name__ == '__main__':
    unittest.main()
