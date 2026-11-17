"""정답지가 없는 명함 폴더를 OCR 로 훑어 원본 결과와 화질 지표를 JSONL 로 저장한다.

    python survey_cards.py <폴더> [<폴더> ...] --out runtime/eval/survey.jsonl
    python survey_cards.py <폴더> --limit 100

전처리 없이 korean / default 두 모델을 모두 실행한다. 외부 API 는 호출하지 않는다.
이미 처리한 사진은 건너뛰므로 중단 후 같은 명령으로 이어서 실행할 수 있다.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

import ocr_test

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
EXIF_ORIENTATION = 0x0112
UPLOAD_MAX_SIDE = 2400
QUALITY_MAX_SIDE = 1000
GLARE_LEVEL = 250
OCR_KEYS = ('texts', 'scores', 'boxes', 'lines', 'avg_score')
PROGRESS_EVERY = 20


def quality(image):
    gray = ImageOps.grayscale(image)
    gray.thumbnail((QUALITY_MAX_SIDE, QUALITY_MAX_SIDE))
    pixels = np.asarray(gray, dtype=np.float32)
    laplacian = (4 * pixels[1:-1, 1:-1] - pixels[:-2, 1:-1] - pixels[2:, 1:-1]
                 - pixels[1:-1, :-2] - pixels[1:-1, 2:])
    return dict(sharpness=round(float(laplacian.var()), 1),
                brightness=round(float(pixels.mean()), 1),
                contrast=round(float(pixels.std()), 1),
                glare=round(float((pixels > GLARE_LEVEL).mean()), 4))


def find_images(folders):
    return sorted(path for folder in folders for path in folder.rglob('*') if path.suffix.lower() in IMAGE_EXTENSIONS)


def finished_paths(out_file):
    if not out_file.exists():
        return set()
    return {json.loads(line)['path'] for line in out_file.read_text(encoding='utf-8').splitlines() if line}


def survey(path, engines, upload):
    row = dict(path=str(path), folder=path.parent.name)
    try:
        with Image.open(path) as picture:
            row['exif_orientation'] = picture.getexif().get(EXIF_ORIENTATION)
            picture = ImageOps.exif_transpose(picture).convert('RGB')
            row.update(width=picture.width, height=picture.height, **quality(picture))
            picture.thumbnail((UPLOAD_MAX_SIDE, UPLOAD_MAX_SIDE))
            picture.save(upload)
        row['models'] = {}
        for name, engine in engines.items():
            result = ocr_test.run_model(engine, upload)
            row['models'][name] = {key: result[key] for key in OCR_KEYS}
    except Exception as error:
        row['error'] = f'{type(error).__name__}: {error}'
    return row


def parse_arguments():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('folders', nargs='+', type=Path, help='명함 사진 폴더 (하위 폴더 포함)')
    parser.add_argument('--out', type=Path, default=Path('runtime/eval/survey.jsonl'), help='결과 JSONL 경로')
    parser.add_argument('--limit', type=int, help='앞에서부터 처리할 장수')
    return parser.parse_args()


def main():
    args = parse_arguments()
    sys.stdout.reconfigure(encoding='utf-8')
    images = find_images(args.folders)[:args.limit]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    finished = finished_paths(args.out)
    print(f'{len(images)}장 중 {len(finished)}장 완료됨', flush=True)

    engines = {name: ocr_test.PaddleOCR(**ocr_test.COMMON, **options) for name, options in ocr_test.MODELS.items()}
    upload = args.out.with_suffix('.tmp.png')
    started = time.time()
    with args.out.open('a', encoding='utf-8') as out:
        for index, path in enumerate(images, start=1):
            if str(path) in finished:
                continue
            out.write(json.dumps(survey(path, engines, upload), ensure_ascii=False) + '\n')
            out.flush()
            if index % PROGRESS_EVERY == 0:
                print(f'[{index}/{len(images)}] {time.time() - started:.0f}초', flush=True)
    upload.unlink(missing_ok=True)
    print('완료', flush=True)


if __name__ == '__main__':
    main()
