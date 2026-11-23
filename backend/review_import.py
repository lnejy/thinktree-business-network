"""Apply previously approved card reviews and team assignments."""
import argparse
import hashlib
import json
from pathlib import Path

from accounts import TEAM_IDS
from card_service import BASE, FIELD_KEYS, Store, now, review_error


def field_fingerprint(extracted):
    values = {key: extracted[key]['value'].strip() for key in FIELD_KEYS}
    canonical = json.dumps(values, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def apply_review_manifest(store, source):
    manifest = json.loads(Path(source).read_text(encoding='utf-8'))
    approvals = manifest['approvals']
    keys = [approval['key'] for approval in approvals]
    if len(set(keys)) != len(keys):
        raise ValueError('승인 목록에 중복 명함이 있습니다.')
    for approval in approvals:
        owners = approval['ownerIds']
        if not owners or len(set(owners)) != len(owners) or not set(owners) <= set(TEAM_IDS):
            raise ValueError('명함 담당자 구성이 올바르지 않습니다.')
        if approval['ownerId'] not in owners:
            raise ValueError('주 담당자를 명함 받은 사람에 포함하세요.')
    report = dict(approved=0, alreadyReviewed=0, missing=0, changed=0, invalid=0)
    with store.lock, store.connect() as db:
        # A write transaction prevents concurrent saves from being overwritten.
        db.execute('BEGIN IMMEDIATE')
        cards = {c['structuredImport']['key']: c for c in
                 (json.loads(row[0]) for row in db.execute('SELECT body FROM cards')) if c.get('structuredImport')}
        for approval in approvals:
            card = cards.get(approval['key'])
            if card is None:
                report['missing'] += 1
                continue
            if card['status'] == 'reviewed':
                report['alreadyReviewed'] += 1
                continue
            if card['status'] != 'ready_for_review' or field_fingerprint(card['extracted']) != approval['fieldsSha256']:
                report['changed'] += 1
                continue
            extracted = {key: dict(value=card['extracted'][key]['value'].strip(),
                                   confidence=card['extracted'][key]['confidence']) for key in FIELD_KEYS}
            if card.get('warnings') or review_error(extracted):
                report['invalid'] += 1
                continue
            card.update(extracted=extracted, status='reviewed', reviewedAt=now(),
                        ownerId=approval['ownerId'], ownerIds=approval['ownerIds'],
                        reviewMethod='validated-structured-batch', reviewedBy='e1')
            db.execute('UPDATE cards SET body=? WHERE id=?', (json.dumps(card, ensure_ascii=False), card['id']))
            report['approved'] += 1
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', type=Path, default=BASE / 'imports' / 'hansung_reviewed.json')
    arguments = parser.parse_args()
    print(json.dumps(apply_review_manifest(Store(), arguments.source), ensure_ascii=False, indent=2))
