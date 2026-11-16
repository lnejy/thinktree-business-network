"""회사명 정규화 — 이해인 팀장의 normalize.py 규칙을 pandas 없이 옮긴 것 (규칙이 바뀌면 normalize.py 와 함께 고친다)."""
import re
import unicodedata

_CORP_TERMS = ["주식회사", "유한회사", "株式会社", "株式會社", "有限会社", "有限會社", "合同会社"]
_ENGLISH_TERMS = [r"co\.?,?\s*ltd", "corporation", "incorporated", "corp", "inc", "limited", "ltd", "llc", "gmbh", "plc"]
_ENGLISH_PATTERN = r"(?<![a-z0-9&\-])(?:" + "|".join(_ENGLISH_TERMS) + r")\.?(?![a-z0-9&\-])"


def normalize_company_name(name):
    """비교용 회사명. 입력이 비었거나 법인 표기뿐이면 빈 문자열."""
    if name is None or (isinstance(name, float) and name != name):
        return ""
    s = unicodedata.normalize("NFKC", str(name)).lower().strip()
    s = re.sub(r"\(\s*[주유株有]\s*\)", "", s)
    for term in _CORP_TERMS:
        s = s.replace(term, "")
    s = re.sub(_ENGLISH_PATTERN, "", s)
    s = re.sub(r"(?<![a-z0-9&\-])(?<!&\s)co\.?[\s,.]*$", "", s)
    s = re.sub(r"[.,]", "", s)
    return re.sub(r"\s+", "", s)
