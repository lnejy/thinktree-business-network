"""Evaluate OCR and field assignment independently on synthetic business cards."""
import argparse
import json
import os
import re
import tempfile
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from card_service import Pipeline, Store, local_fields, map_structured
from ocr_report import cer, squeeze


LABELS = {
    'ko': ('회사명', '이름', '부서', '직책'),
    'en': ('Company', 'Name', 'Department', 'Title'),
    'ja': ('会社名', '氏名', '部署', '役職'),
    'mixed': ('Company', '이름', '部署', 'Title'),
}
VALUES = {
    'ko': ('테스트 연구소', '김가람', '개발팀', '연구원'),
    'en': ('Example Research', 'Alex Kim', 'Engineering', 'Researcher'),
    'ja': ('試験研究所', '山田花子', '開発部', '研究員'),
    'mixed': ('Example Research', '김가람', '開発部', 'Researcher'),
}
CONDITIONS = (
    ('ko', 'clean'), ('en', 'portrait'), ('ja', 'clean'), ('mixed', 'clean'),
    ('en', 'low_resolution'), ('ko', 'tilted'), ('ja', 'cropped'), ('en', 'glare'),
    ('ko', 'shadow'), ('en', 'small_text'), ('mixed', 'patterned'),
)


def fixture(language, condition, path, fonts):
    keys = ('company', 'name', 'department', 'position')
    truth = dict(zip(keys, VALUES[language]))
    truth.update(email='person@example.test', mobile='010-1234-5678')
    lines = [f'{label}: {truth[key]}' for key, label in zip(keys, LABELS[language])]
    lines += [truth['email'], f'Mobile: {truth["mobile"]}']
    size = (700, 1050) if condition == 'portrait' else (1100, 650)
    image = Image.new('RGB', size, '#f5f8fc')
    draw = ImageDraw.Draw(image)
    if condition == 'patterned':
        for x in range(-size[1], size[0], 35):
            draw.line((x, 0, x + size[1], size[1]), fill='#b9c9e2', width=12)
    font_size = 17 if condition == 'small_text' else 40
    for index, line in enumerate(lines):
        font = fonts['ja'] if any('\u3040' <= ch <= '\u9fff' for ch in line) else fonts['ko']
        draw.text((48, 46 + index * (font_size + 20)), line, font=ImageFont.truetype(str(font), font_size), fill='#172334')
    if condition == 'low_resolution':
        image = image.resize((330, 195), Image.Resampling.BILINEAR)
    if condition == 'tilted':
        image = image.rotate(9, expand=True, fillcolor='white', resample=Image.Resampling.BICUBIC)
    if condition == 'cropped':
        image = image.crop((72, 0, *size))
    if condition in ('glare', 'shadow'):
        overlay = Image.new('RGBA', size)
        overlay_draw = ImageDraw.Draw(overlay)
        if condition == 'glare':
            overlay_draw.ellipse((140, 65, 720, 335), fill=(255, 255, 255, 190))
        else:
            overlay_draw.polygon([(0, 0), (520, 0), (680, size[1]), (0, size[1])], fill=(0, 0, 0, 135))
        image = Image.alpha_composite(image.convert('RGBA'), overlay).convert('RGB')
    image.save(path)
    return lines, truth


def field_checks(lines, truth):
    actual = map_structured(local_fields(lines))
    def normalized(value):
        return re.sub(r'[^\w@.]', '', value.casefold())
    return {key: normalized(actual[key]['value']) == normalized(value) for key, value in truth.items()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true', help='Run local PaddleOCR as well as isolated field evaluation')
    parser.add_argument('--output', type=Path, default=Path('runtime/registration_evaluation.json'))
    parser.add_argument('--fonts', type=Path, default=Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts')
    args = parser.parse_args()
    fonts = {'ko': args.fonts / 'malgun.ttf', 'ja': args.fonts / 'msgothic.ttc'}
    if not all(path.is_file() for path in fonts.values()):
        parser.error('The font directory must contain malgun.ttf and msgothic.ttc')
    results = []
    totals = defaultdict(lambda: {'correct': 0, 'total': 0, 'ocrInputCorrect': 0})
    with tempfile.TemporaryDirectory() as temporary:
        pipeline = Pipeline(Store(temporary)) if args.live else None
        try:
            for language, condition in CONDITIONS:
                path = Path(temporary) / 'fixture.png'
                lines, truth = fixture(language, condition, path, fonts)
                isolated = field_checks(lines, truth)
                row = dict(language=language, condition=condition, fieldExtraction=isolated)
                if pipeline:
                    recognized = pipeline.recognize(path, 'auto' if language == 'mixed' else language)['lines']
                    row['ocrCharacterErrorRate'] = cer(squeeze('\n'.join(lines)), squeeze('\n'.join(recognized)))
                    row['fieldsFromOcr'] = field_checks(recognized, truth)
                results.append(row)
                for key, correct in isolated.items():
                    totals[key]['correct'] += int(correct)
                    totals[key]['total'] += 1
                    if pipeline:
                        totals[key]['ocrInputCorrect'] += int(row['fieldsFromOcr'][key])
                print(f'{language}/{condition}: fields {sum(isolated.values())}/{len(isolated)}' +
                      (f", OCR CER {row['ocrCharacterErrorRate']:.1%}, fields from OCR {sum(row['fieldsFromOcr'].values())}/{len(isolated)}" if pipeline else ''))
        finally:
            if pipeline:
                pipeline.close()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(dict(live=args.live, cases=results, byField=dict(totals)), indent=2), encoding='utf-8')
    print(f'Written {len(results)} cases to {args.output}')


if __name__ == '__main__':
    main()
