"""survey_cards.py 결과(JSONL)를 정답지 없이 요약한다.

    python analyze_survey.py runtime/eval/survey.jsonl
    python analyze_survey.py runtime/eval/survey.jsonl --worst 50

폴더별 점수·화질 분포, 화질 구간별 평균 점수, 의심 표시 집계, 점수가 낮은 카드 목록을 출력한다.

의심 표시
    almost_no_text    인식된 글자가 20자 미만
    low_score         평균 점수 0.85 미만
    many_low_tokens   점수 0.8 미만인 글자가 15% 초과
    broken_email      '@' 는 있는데 이메일 형식이 아님
    no_email          이메일 없음
    no_phone          전화번호 없음
    portrait          세로로 긴 사진
    small_image       짧은 변이 600px 미만
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

EMAIL = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')
PHONE = re.compile(r'\+?\d[\d ().-]{7,}\d')
HANGUL = re.compile(r'[가-힣]')
KANA = re.compile(r'[぀-ヿ]')

MIN_CHARACTERS = 20
LOW_CARD_SCORE = 0.85
LOW_TOKEN_SCORE = 0.8
MAX_LOW_TOKEN_SHARE = 0.15
PORTRAIT_RATIO = 1.1
MIN_SHORT_SIDE = 600
PERCENTILES = (5, 25, 50, 75, 95)
UNBOUNDED = float('inf')
BUCKETS = [
    ('선명도', 'sharpness', [0, 50, 100, 200, 400, 800, UNBOUNDED]),
    ('반사 비율', 'glare', [0, 0.001, 0.01, 0.05, 0.2, UNBOUNDED]),
    ('대비', 'contrast', [0, 15, 25, 40, 60, UNBOUNDED]),
    ('짧은 변(px)', 'short_side', [0, 600, 900, 1200, UNBOUNDED]),
]


def flags_for(card):
    checks = [
        ('almost_no_text', card['characters'] < MIN_CHARACTERS),
        ('low_score', card['score'] < LOW_CARD_SCORE),
        ('many_low_tokens', card['low_token_share'] > MAX_LOW_TOKEN_SHARE),
        ('broken_email', card['at_signs'] != len(card['emails'])),
        ('no_email', not card['emails'] and not card['at_signs']),
        ('no_phone', not card['phones']),
        ('portrait', card['height'] > card['width'] * PORTRAIT_RATIO),
        ('small_image', card['short_side'] < MIN_SHORT_SIDE),
    ]
    return [name for name, raised in checks if raised]


def describe(row):
    models = row['models']
    chosen = max(models, key=lambda name: models[name]['avg_score'])
    best = models[chosen]
    text = '\n'.join(best['lines'])
    characters = sum(len(token) for token in best['texts'])
    low_characters = sum(len(token) for token, score in zip(best['texts'], best['scores']) if score < LOW_TOKEN_SCORE)
    card = dict(row, chosen=chosen, score=best['avg_score'], tokens=len(best['texts']), characters=characters, text=text,
                low_token_share=low_characters / characters if characters else 1.0,
                short_side=min(row['width'], row['height']),
                emails=EMAIL.findall(text), at_signs=text.count('@'), phones=PHONE.findall(text),
                hangul=bool(HANGUL.search(text)), kana=bool(KANA.search(text)))
    card['flags'] = flags_for(card)
    return card


def load(survey_file):
    rows = [json.loads(line) for line in Path(survey_file).read_text(encoding='utf-8').splitlines() if line]
    cards = [describe(row) for row in rows if 'models' in row]
    return cards, len(rows) - len(cards)


def percentiles(values):
    ordered = sorted(values)
    picked = [ordered[min(len(ordered) - 1, len(ordered) * point // 100)] for point in PERCENTILES]
    return '  '.join(f'p{point}={value:.3g}' for point, value in zip(PERCENTILES, picked))


def is_suspect(card):
    return 'low_score' in card['flags'] or 'many_low_tokens' in card['flags']


def print_folder(folder, cards):
    print(f'\n== {folder}: {len(cards)}장 ==')
    print('  채택 모델   ', dict(Counter(card['chosen'] for card in cards)))
    print('  EXIF 회전   ', dict(Counter(card['exif_orientation'] for card in cards)))
    for title, key in [('평균 점수', 'score'), ('글자 수', 'characters'), ('저신뢰 글자', 'low_token_share'),
                       ('선명도', 'sharpness'), ('짧은 변(px)', 'short_side'), ('반사 비율', 'glare')]:
        print(f'  {title:<10}', percentiles([card[key] for card in cards]))
    for flag, count in Counter(flag for card in cards for flag in card['flags']).most_common():
        print(f'  {flag:<18}{count:>4}장 ({count / len(cards) * 100:4.1f}%)')


def print_buckets(cards, title, key, edges):
    print(f'\n{title} 구간별 평균 점수')
    for low, high in zip(edges, edges[1:]):
        group = [card for card in cards if low <= card[key] < high]
        if not group:
            continue
        mean_score = sum(card['score'] for card in group) / len(group)
        suspect_share = sum(is_suspect(card) for card in group) / len(group)
        print(f'  {low:>7g} ~ {high:<7g} {len(group):>4}장  평균 {mean_score:.3f}  문제 의심 {suspect_share * 100:4.1f}%')


def print_worst(cards, count):
    print(f'\n== 점수 낮은 순 {count}장 ==')
    for card in sorted(cards, key=lambda card: card['score'] - card['low_token_share'])[:count]:
        print(f'  {card["score"]:.3f}  저신뢰 {card["low_token_share"] * 100:3.0f}%  {card["characters"]:>4}자'
              f'  선명도 {card["sharpness"]:<7g} {card["width"]}x{card["height"]}  {card["chosen"]:<7}'
              f'  {",".join(card["flags"])}  {card["folder"]}/{Path(card["path"]).name}')


def parse_arguments():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('survey', help='survey_cards.py 가 만든 JSONL 파일')
    parser.add_argument('--worst', type=int, default=30, help='점수 낮은 순으로 보여줄 장수')
    return parser.parse_args()


def main():
    args = parse_arguments()
    sys.stdout.reconfigure(encoding='utf-8')
    cards, unreadable = load(args.survey)
    print(f'{len(cards) + unreadable}장 (읽기 실패 {unreadable}장)')
    for folder in sorted({card['folder'] for card in cards}):
        print_folder(folder, [card for card in cards if card['folder'] == folder])
    for title, key, edges in BUCKETS:
        print_buckets(cards, title, key, edges)
    print_worst(cards, args.worst)


if __name__ == '__main__':
    main()
