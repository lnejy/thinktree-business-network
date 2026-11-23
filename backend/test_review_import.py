import json
import tempfile
import unittest
from pathlib import Path

from card_service import Store, empty_fields
from review_import import apply_review_manifest, field_fingerprint


class ReviewImportTests(unittest.TestCase):
    def test_approved_content_only_and_idempotent_replay(self):
        with tempfile.TemporaryDirectory() as folder:
            store = Store(folder)
            approvals = []
            for index in range(4):
                fields = empty_fields()
                fields['company']['value'] = 'Example'
                fields['name']['value'] = f'Contact {index}'
                card = store.create('e1', 'saved', 'auto')
                key = f'source/{index}.jpg'
                store.update(card['id'], status='ready_for_review', extracted=fields, structuredImport={'key': key})
                approvals.append(dict(key=key, fieldsSha256=field_fingerprint(fields), ownerId='e3', ownerIds=['e3', 'e1']))
                if index == 1:
                    fields['name']['value'] = 'User edited'
                    store.update(card['id'], extracted=fields)
                if index == 2:
                    store.update(card['id'], warnings=['Check original'])
                if index == 3:
                    with store.connect() as db:
                        db.execute('DELETE FROM cards WHERE id=?', (card['id'],))
            path = Path(folder) / 'reviews.json'
            path.write_text(json.dumps({'approvals': approvals}), encoding='utf-8')
            result = apply_review_manifest(store, path)
            self.assertEqual(result, dict(approved=1, alreadyReviewed=0, missing=1, changed=1, invalid=1))
            reviewed = next(c for c in store.all() if c['status'] == 'reviewed')
            self.assertEqual(reviewed['ownerIds'], ['e3', 'e1'])
            snapshot = store.all()
            self.assertEqual(apply_review_manifest(store, path)['alreadyReviewed'], 1)
            self.assertEqual(store.all(), snapshot)


if __name__ == '__main__':
    unittest.main()
