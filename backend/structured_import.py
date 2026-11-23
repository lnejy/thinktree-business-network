"""Import saved JSONL extraction results without calling OCR or AI services."""
import argparse
import hashlib
import json
import re
from pathlib import Path, PureWindowsPath

from PIL import Image, ImageOps

from accounts import TEAM_IDS
from card_service import BASE, Store, map_structured, now
from evaluation_import import IMAGE_EXTENSIONS


def image_key(filename):
    return re.sub(r'\([^()]*\)$', '', PureWindowsPath(filename).stem).casefold()


def read_records(path):
    records = []
    seen = set()
    for line_number, line in enumerate(Path(path).read_text(encoding='utf-8-sig').splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        fields = row.get('fields')
        if not isinstance(fields, dict) or not isinstance(row.get('path'), str):
            raise ValueError(f'{line_number}행의 path 또는 fields 형식이 올바르지 않습니다.')
        for key in ('company', 'site', 'person', 'extra'):
            if not isinstance(fields.get(key), dict):
                raise ValueError(f'{line_number}행의 {key} 형식이 올바르지 않습니다.')
        if not isinstance(fields.get('departments'), list) or not all(isinstance(x, str) for x in fields['departments']):
            raise ValueError(f'{line_number}행의 departments 형식이 올바르지 않습니다.')
        if not isinstance(row.get('warnings'), list) or not all(isinstance(x, str) for x in row['warnings']):
            raise ValueError(f'{line_number}행의 warnings 형식이 올바르지 않습니다.')
        key = str(row.get('folder', '')) + '/' + PureWindowsPath(row['path']).name
        if key in seen:
            raise ValueError(f'{line_number}행에 중복된 원본 경로가 있습니다.')
        seen.add(key)
        # Validate the existing field mapper before writing any records.
        map_structured(fields)
        records.append((key, row))
    return records


def import_structured(store, source, image_roots=()):
    records = read_records(source)
    report = dict(records=len(records), created=0, updated=0, unchanged=0, preservedConfirmed=0,
                  withImage=0, withoutImage=0, missingCompany=0, warnings=0, previouslyRemoved=0)
    images = {}
    for root in (BASE / 'cards', *map(Path, image_roots)):
        if root.is_dir():
            for path in root.rglob('*'):
                if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
                    images.setdefault(image_key(path.name), []).append(path)
    with store.lock, store.connect() as db:
        db.execute('BEGIN IMMEDIATE')
        db.execute('CREATE TABLE IF NOT EXISTS structured_imports (source_key TEXT PRIMARY KEY, card_id TEXT NOT NULL)')
        imported = dict(db.execute('SELECT source_key,card_id FROM structured_imports'))
        existing = [json.loads(row[0]) for row in db.execute('SELECT body FROM cards ORDER BY rowid DESC')]
        existing_ids = {card['id'] for card in existing}
        by_source = {c.get('structuredImport', {}).get('key'): c for c in existing if c.get('structuredImport')}
        by_filename = {}
        for card in existing:
            if card.get('sourceFileName'):
                by_filename.setdefault(image_key(card['sourceFileName']), []).append(card)
        planned = []
        mappings = []
        for index, (key, row) in enumerate(records):
            if key in imported and imported[key] not in existing_ids:
                report['previouslyRemoved'] += 1
                continue
            filename = PureWindowsPath(row['path']).name
            matches = by_filename.get(image_key(filename), [])
            card = by_source.get(key)
            if card is None and len(matches) == 1:
                card = matches[0]
            if card is None and len(matches) > 1:
                raise ValueError(f'원본 파일 {filename}과 연결되는 기존 명함이 여러 개입니다.')
            created = card is None
            if created:
                card_id = 'structured-' + hashlib.sha256(key.encode()).hexdigest()[:24]
                owner = TEAM_IDS[index % len(TEAM_IDS)]
                card = dict(id=card_id, ownerId=owner, ownerIds=[owner], source='structured-import',
                            sourceFileName=filename, uploadedAt=now(), status='ready_for_review',
                            imageUrl='', confidence=0, engine='saved-structured', requestedLanguage='auto', ocrRawText='')
            else:
                card = dict(card)
            fields = row['fields']
            mapped = map_structured(fields)
            secondary = fields['person'].get('secondary_title')
            if secondary and secondary != mapped['position']['value']:
                mapped['position']['value'] = ' / '.join(filter(None, [mapped['position']['value'], secondary]))
            fingerprint = hashlib.sha256(json.dumps(row, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
            prior = card.get('structuredImport') or {}
            confirmed = card['status'] == 'reviewed'
            if confirmed:
                report['preservedConfirmed'] += 1
            elif prior.get('sha256') != fingerprint:
                baseline = prior.get('mapped') or map_structured(card.get('structured') or {})
                old = card.get('extracted') or {}
                card['extracted'] = {
                    field: old[field] if old.get(field, {}).get('value') and old[field]['value'] != baseline[field]['value'] else value
                    for field, value in mapped.items()
                }
                card.update(structured=fields, departmentPath=fields['departments'],
                            model=row.get('model'), warnings=row['warnings'],
                            structuredImport=dict(key=key, sha256=fingerprint, folder=row.get('folder'),
                                                  domain=row.get('domain'), importedAt=now(), mapped=mapped))
            paths = images.get(image_key(filename), [])
            exact = [p for p in paths if p.name.casefold() == filename.casefold()]
            candidates = exact or paths
            if not card.get('imageUrl') and candidates:
                # Duplicate copies must contain identical bytes before selecting one.
                if len({hashlib.sha256(p.read_bytes()).digest() for p in candidates}) > 1:
                    raise ValueError(f'원본 파일 {filename}에 서로 다른 이미지 후보가 있습니다.')
                original = candidates[0]
                with Image.open(original) as picture:
                    preview = ImageOps.exif_transpose(picture).convert('RGB')
                    preview.thumbnail((2400, 2400))
                    preview.save(store.images / f'{card["id"]}.png')
                store.originals.mkdir(exist_ok=True)
                (store.originals / f'{card["id"]}{original.suffix.lower()}').write_bytes(original.read_bytes())
                card.update(imageUrl=f'/api/cards/{card["id"]}/image',
                            originalUrl=f'/api/cards/{card["id"]}/original', originalExtension=original.suffix.lower())
            report['withImage' if card.get('imageUrl') else 'withoutImage'] += 1
            report['missingCompany'] += int(not mapped['company']['value'])
            report['warnings'] += int(bool(row['warnings']))
            before = by_source.get(key) or (matches[0] if len(matches) == 1 else None)
            report['created' if created else 'unchanged' if before == card else 'updated'] += 1
            planned.append(card)
            mappings.append((key, card['id']))
        db.executemany('INSERT INTO cards VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body',
                       [(c['id'], json.dumps(c, ensure_ascii=False)) for c in planned])
        db.executemany('INSERT OR IGNORE INTO structured_imports VALUES (?,?)', mappings)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', type=Path, default=BASE / 'imports' / 'hansung_structured.jsonl')
    parser.add_argument('--image-root', action='append', default=[])
    arguments = parser.parse_args()
    print(json.dumps(import_structured(Store(), arguments.source, arguments.image_root), ensure_ascii=False, indent=2))
