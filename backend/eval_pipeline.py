"""서비스 OCR 경로(card_service.Pipeline.recognize)를 정답지로 채점한다.

    python eval_pipeline.py                         현재 서비스 전처리로 OCR 실행 후 채점
    python eval_pipeline.py --prep none             전처리 없이 실행 (비교용)
    python eval_pipeline.py --prep saved            out/*.json 에 저장된 결과를 채점 (OCR 실행 안 함)
    python eval_pipeline.py --rotate 90             사진을 90도 돌려서 넣기
    python eval_pipeline.py --from saved --llm gemini --label saved-llm
                                                    저장된 OCR 결과로 LLM 구조화까지 채점 (외부 API 호출)
    python eval_pipeline.py --compare saved         이전 실행 결과와 비교

정답지: gt/<파일명>.txt (줄 단위 원문), gt_fields/<파일명>.json (필드 값)
결과:   runtime/eval/<label>.json

필드 검출률  정답 필드 값이 OCR 원문 안에 그대로 들어 있는 비율
LLM 필드 정확도  구조화 결과가 정답 필드 값과 일치하는 비율
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

import card_service
import ocr_extract
from ocr_report import evaluate

BASE = Path(__file__).resolve().parent
RESULT_DIR = BASE / 'runtime' / 'eval'
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
UPLOAD_MAX_SIDE = 2400
FIELDS = ['company.name', 'person.name', 'person.name_reading', 'person.title', 'person.email',
          'person.mobile', 'person.tel', 'site.tel', 'site.fax', 'site.address']
PHONE_FIELDS = {'person.mobile', 'person.tel', 'site.tel', 'site.fax'}
OCR_KEYS = ('lines', 'avg_score', 'model')
PREPROCESSORS = {
    'current': card_service.prepare_ocr,
    'none': lambda image: image.convert('RGB'),
}


def pick(data, path):
    for key in path.split('.'):
        data = data.get(key) if isinstance(data, dict) else None
    return data


def digits_only(text):
    return re.sub(r'\D', '', text)


def without_spaces(text):
    return ''.join(text.split()).casefold()


def card_label(stem):
    return stem[stem.rfind('(') + 1:-1] if stem.endswith(')') else stem


def load_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def field_presence(truth, lines):
    text = without_spaces(''.join(lines))
    digits = digits_only(text)
    found = {}
    for path in FIELDS:
        value = pick(truth, path)
        if not value:
            continue
        found[path] = digits_only(value) in digits if path in PHONE_FIELDS else without_spaces(value) in text
    return found


def as_uploaded(image_path, rotate):
    with Image.open(image_path) as picture:
        picture = ImageOps.exif_transpose(picture).convert('RGB')
        picture.thumbnail((UPLOAD_MAX_SIDE, UPLOAD_MAX_SIDE))
        if rotate:
            picture = picture.rotate(rotate, expand=True, fillcolor=picture.getpixel((2, 2)))
        return picture


def recognize_all(images, preprocessor, rotate):
    card_service.prepare_ocr = PREPROCESSORS[preprocessor]
    results = {}
    with tempfile.TemporaryDirectory() as temporary:
        pipeline = card_service.Pipeline(card_service.Store(temporary))
        upload = Path(temporary) / 'card.png'
        try:
            for index, image in enumerate(images, start=1):
                as_uploaded(image, rotate).save(upload)
                ocr = pipeline.recognize(upload, 'auto')
                results[image.stem] = dict(lines=ocr['lines'], avg_score=ocr['avg_score'], model=ocr['chosen_model'])
                turned = f'  {ocr["rotated"]}도 회전' if ocr['rotated'] else ''
                print(f'[{index}/{len(images)}] {image.stem}  {ocr["chosen_model"]} {ocr["avg_score"]:.3f}{turned}', flush=True)
        finally:
            pipeline.close()
    return results


def load_saved(images):
    results = {}
    for image in images:
        saved = load_json(BASE / 'out' / f'{image.stem}.json')
        results[image.stem] = dict(lines=saved['lines'], avg_score=saved['avg_score'], model=saved['chosen_model'])
    return results


def load_previous_ocr(label):
    cards = load_json(RESULT_DIR / f'{label}.json')['cards']
    return {stem: {key: card[key] for key in OCR_KEYS} for stem, card in cards.items()}


def compare_fields(truth, fields):
    checks, wrong = {}, {}
    for path in FIELDS:
        section, key = path.split('.')
        if key not in truth.get(section, {}):
            continue
        expected, actual = pick(truth, path), pick(fields, path)
        checks[path] = ocr_extract.normalize(path, expected) == ocr_extract.normalize(path, actual)
        if not checks[path]:
            wrong[path] = dict(expected=expected, actual=actual)
    return checks, wrong


def structure_all(results, images, engine_name, llm_input):
    from dotenv import load_dotenv

    load_dotenv(BASE / '.env')
    engine = ocr_extract.ENGINES[engine_name]()
    image_by_stem = {image.stem: image for image in images}
    for index, (stem, result) in enumerate(results.items(), start=1):
        truth_file = BASE / 'gt_fields' / f'{stem}.json'
        if not truth_file.exists():
            continue
        image = ocr_extract.encode_image(image_by_stem[stem]) if llm_input != 'text' else None
        lines = result['lines'] if llm_input != 'image' else []
        try:
            fields, model, _, _ = ocr_extract.extract_with_retry(engine, image, ocr_extract.ocr_prompt(dict(lines=lines)))
        except ocr_extract.ExtractError as error:
            print(f'[{index}/{len(results)}] {stem}  실패: {error}', flush=True)
            continue
        checks, wrong = compare_fields(load_json(truth_file), fields)
        result.update(llm_fields=checks, llm_wrong=wrong, llm_model=model, structured=fields)
        print(f'[{index}/{len(results)}] {stem}  {sum(checks.values())}/{len(checks)}', flush=True)


def score(results):
    cards = {}
    for stem, result in results.items():
        card = dict(result)
        text_truth = BASE / 'gt' / f'{stem}.txt'
        if text_truth.exists():
            report = evaluate(text_truth.read_text(encoding='utf-8').splitlines(), result['lines'])
            line_scores = [1 - min(detail['score'], 1) for detail in report['details']]
            card['coverage'] = report['coverage']
            card['line_accuracy'] = sum(line_scores) / len(line_scores)
            card['misses'] = [detail['line'] for detail in report['details'] if not detail['ok']]
        field_truth = BASE / 'gt_fields' / f'{stem}.json'
        if field_truth.exists():
            card['fields'] = field_presence(load_json(field_truth), result['lines'])
        cards[stem] = card
    return cards


def mean_of(cards, key):
    values = [card[key] for card in cards.values() if key in card]
    return sum(values) / len(values) if values else None


def tally(cards, key):
    per_field = {}
    for path in FIELDS:
        outcomes = [card[key][path] for card in cards.values() if path in card.get(key, {})]
        if outcomes:
            per_field[path] = [sum(outcomes), len(outcomes)]
    total = [sum(hit for hit, _ in per_field.values()), sum(count for _, count in per_field.values())]
    return per_field, total


def summarize(cards):
    fields, fields_total = tally(cards, 'fields')
    summary = dict(coverage=mean_of(cards, 'coverage'), line_accuracy=mean_of(cards, 'line_accuracy'),
                   fields=fields, fields_total=fields_total)
    llm_fields, llm_total = tally(cards, 'llm_fields')
    if llm_fields:
        summary.update(llm_fields=llm_fields, llm_total=llm_total)
    return summary


def change(now, before):
    return '' if before is None else f'  ({(now - before) * 100:+.1f}p)'


def print_cards(cards):
    for stem, card in cards.items():
        fields = card.get('fields', {})
        missing = [path for path, found in fields.items() if not found]
        print(f'  {card_label(stem):<12} 포함률 {card.get("coverage", 0) * 100:5.1f}%'
              f'  줄정확도 {card.get("line_accuracy", 0) * 100:5.1f}%'
              f'  필드 {sum(fields.values())}/{len(fields)}'
              + (f'  누락: {", ".join(missing)}' if missing else ''))


def print_field_table(title, per_field, total, previous_per_field, previous_total):
    hit, count = total
    before = previous_total[0] / previous_total[1] if previous_total else None
    print(f'  {title} {hit / count * 100:5.1f}%  ({hit}/{count}){change(hit / count, before)}')
    for path, (hit, count) in per_field.items():
        earlier = (previous_per_field or {}).get(path)
        note = f'  (이전 {earlier[0]}/{earlier[1]})' if earlier and earlier[0] != hit else ''
        print(f'    {path:<20}{hit:>3}/{count:<3}{note}')


def print_llm_mismatches(cards):
    for stem, card in cards.items():
        for path, pair in card.get('llm_wrong', {}).items():
            print(f'    X {card_label(stem)} {path}: 정답 {pair["expected"]!r} / 결과 {pair["actual"]!r}')


def show(label, cards, summary, previous=None):
    previous = previous or {}
    print(f'\n== {label} ==')
    print_cards(cards)
    print(f'\n  내용 포함률   {summary["coverage"] * 100:5.1f}%{change(summary["coverage"], previous.get("coverage"))}')
    print(f'  줄별 정확도   {summary["line_accuracy"] * 100:5.1f}%{change(summary["line_accuracy"], previous.get("line_accuracy"))}')
    print_field_table('필드 검출률  ', summary['fields'], summary['fields_total'],
                      previous.get('fields'), previous.get('fields_total'))
    if 'llm_total' in summary:
        print()
        print_field_table('LLM 필드 정확도', summary['llm_fields'], summary['llm_total'],
                          previous.get('llm_fields'), previous.get('llm_total'))
        print_llm_mismatches(cards)


def parse_arguments():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--prep', choices=[*PREPROCESSORS, 'saved'], default='current', help='OCR 입력 준비 방식')
    parser.add_argument('--rotate', type=int, default=0, help='입력 사진을 돌릴 각도')
    parser.add_argument('--from', dest='source', help='OCR 을 다시 돌리지 않고 재사용할 이전 결과 이름')
    parser.add_argument('--llm', choices=sorted(ocr_extract.ENGINES), help='LLM 구조화까지 채점 (외부 API 로 전송됨)')
    parser.add_argument('--llm-input', choices=['both', 'image', 'text'], default='both', help='LLM 에 보낼 입력')
    parser.add_argument('--label', help='결과 이름 (기본: --prep 값)')
    parser.add_argument('--compare', help='비교할 이전 결과 이름')
    return parser.parse_args()


def main():
    args = parse_arguments()
    sys.stdout.reconfigure(encoding='utf-8')
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    images = sorted(path for path in (BASE / 'cards').iterdir() if path.suffix.lower() in IMAGE_EXTENSIONS)

    if args.source:
        results = load_previous_ocr(args.source)
    elif args.prep == 'saved':
        results = load_saved(images)
    else:
        results = recognize_all(images, args.prep, args.rotate)
    if args.llm:
        structure_all(results, images, args.llm, args.llm_input)

    cards = score(results)
    summary = summarize(cards)
    previous = load_json(RESULT_DIR / f'{args.compare}.json')['summary'] if args.compare else None
    label = args.label or args.prep
    show(label, cards, summary, previous)

    result_file = RESULT_DIR / f'{label}.json'
    result_file.write_text(json.dumps(dict(summary=summary, cards=cards), ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n저장: {result_file}')


if __name__ == '__main__':
    main()
