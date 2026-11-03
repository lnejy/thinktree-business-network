"""Import saved OCR evaluations without invoking OCR models or external services."""
import hashlib
import json
import logging
import shutil
from pathlib import Path

from PIL import Image, ImageOps

from card_service import BASE, local_fields, map_structured, now
from ocr_report import evaluate

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
log = logging.getLogger(__name__)


def ocr_fingerprint(data):
    canonical = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def import_evaluation(store, source=BASE):
    source = Path(source)
    result = dict(imported=0, existing=0, skipped=0, errors=[])
    if not (source / 'cards').is_dir():
        return result
    with store.connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS evaluation_imports (id TEXT PRIMARY KEY)')
    metrics_path = source / 'evaluation_metrics.json'
    saved_metrics = json.loads(metrics_path.read_text(encoding='utf-8')) if metrics_path.exists() else {}
    for original in sorted((source / 'cards').iterdir()):
        if original.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        card_id = 'evaluation-' + hashlib.sha256(original.name.encode('utf-8')).hexdigest()[:24]
        with store.connect() as db:
            imported = db.execute('SELECT id FROM evaluation_imports WHERE id=?', (card_id,)).fetchone()
        if imported:
            result['existing'] += 1
            continue
        try:
            ocr_path = source / 'out' / f'{original.stem}.json'
            if not ocr_path.exists():
                result['skipped'] += 1
                continue
            ocr = json.loads(ocr_path.read_text(encoding='utf-8'))
            lines = ocr.get('lines') or []
            structured_path = source / 'out' / 'structured' / ocr_path.name
            saved = json.loads(structured_path.read_text(encoding='utf-8')) if structured_path.exists() else None
            fields = saved['llm_structured_json'] if saved else local_fields(lines)
            warnings = list(saved.get('warnings') or []) if saved else ['저장된 OCR 결과입니다. 구조화 결과가 없는 항목은 원본을 보고 입력하세요.']
            truth = source / 'gt' / f'{original.stem}.txt'
            report = evaluate(truth.read_text(encoding='utf-8').splitlines(), lines) if truth.exists() else None
            cached = saved_metrics.get(original.name)
            if report is None and cached and cached.get('ocrSha256') == ocr_fingerprint(ocr):
                report = cached['report']
            scores = []
            for model, data in (ocr.get('raw') or {}).items():
                values = data.get('scores') or []
                scores.append(dict(model=model, confidence=round(sum(values) / len(values) * 100, 1) if values else 0,
                                   textCount=len(data.get('texts') or []), selected=model == ocr.get('chosen_model')))
            with Image.open(original) as picture:
                preview = ImageOps.exif_transpose(picture).convert('RGB')
                preview.thumbnail((2400, 2400))
                preview.save(store.images / f'{card_id}.png')
            store.originals.mkdir(exist_ok=True)
            shutil.copyfile(original, store.originals / f'{card_id}{original.suffix.lower()}')
            visual = next((p for p in (source / 'out' / 'images').glob(f'{original.stem}_ocr_res_img.*')
                           if p.suffix.lower() in IMAGE_EXTENSIONS), None)
            if visual:
                store.visualizations.mkdir(exist_ok=True)
                shutil.copyfile(visual, store.visualizations / f'{card_id}{visual.suffix.lower()}')
            card = dict(id=card_id, ownerId='e1', status='ready_for_review',
                        imageUrl=f'/api/cards/{card_id}/image', originalUrl=f'/api/cards/{card_id}/original',
                        originalExtension=original.suffix.lower(), sourceFileName=original.name,
                        uploadedAt=now(), importedAt=now(), source='evaluation', engine='saved-evaluation',
                        requestedLanguage='auto', language=ocr.get('language'),
                        confidence=round(float(ocr.get('avg_score') or 0) * 100, 1),
                        model=ocr.get('chosen_model'), ocrRawText='\n'.join(lines),
                        extracted=map_structured(fields), structured=fields,
                        departmentPath=fields.get('departments') or [], warnings=warnings,
                        ocr=ocr, evaluation=dict(models=scores, lineCount=len(lines),
                            hasGroundTruth=report is not None,
                            coverage=round(report['coverage'] * 100, 1) if report else None,
                            accuracy=round(report['accuracy'] * 100, 1) if report else None,
                            lineRecall=round(report['recall'] * 100, 1) if report else None,
                            groundTruthDetails=report.get('details', []) if report else []))
            if visual:
                card.update(visualizationUrl=f'/api/cards/{card_id}/ocr-image', visualizationExtension=visual.suffix.lower())
            # Import once: later edits, confirmations and rejections survive restart.
            with store.lock, store.connect() as db:
                db.execute('INSERT OR IGNORE INTO cards VALUES (?,?)', (card_id, json.dumps(card, ensure_ascii=False)))
                db.execute('INSERT OR IGNORE INTO evaluation_imports VALUES (?)', (card_id,))
            result['imported'] += 1
        except Exception:
            log.exception('Saved OCR import failed: %s', original.name)
            result['errors'].append(original.name)
    return result
