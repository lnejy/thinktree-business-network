"""Company accounts, local bootstrap and persistent sessions."""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import subprocess
import time
from uuid import uuid4

from fastapi import HTTPException

COMPANY = 'ThinkTree'
COOKIE = 'thinktree_session'
SESSION_SECONDS = 7 * 24 * 60 * 60
COLORS = ('#2563EB', '#7C3AED', '#059669', '#D97706', '#0891B2')
TEAM = (
    ('e1', 'jaeyeon', '원재연'),
    ('e2', 'beomchang', '고범창'),
    ('e3', 'seungmin', '양승민'),
    ('e4', 'haein', '이해인'),
    ('e5', 'hyejeong', '윤혜정'),
)
TEAM_IDS = tuple(member[0] for member in TEAM)


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def password_hash(password, salt):
    return hashlib.scrypt(password.encode('utf-8'), salt=salt, n=32768, r=8, p=1,
                          maxmem=64 * 1024 * 1024).hex()


def card_owners(card):
    return card.get('ownerIds') or [card['ownerId']]


def restrict_windows_access(path):
    identity = subprocess.check_output(['whoami', '/user', '/fo', 'csv', '/nh'])
    sid = re.search(rb'S-1-[\d-]+', identity)[0].decode('ascii')
    subprocess.run(['icacls', str(path), '/inheritance:r', '/grant:r',
                    f'*{sid}:(F)', '*S-1-5-18:(F)', '*S-1-5-32-544:(F)'],
                   check=True, capture_output=True)


def distribute_legacy_cards(store):
    """Assign cards from before accounts existed without changing any card content."""
    with store.lock:
        legacy = [card for card in reversed(store.all()) if not card.get('ownerIds')]
        for confirmed in (True, False):
            group = [card for card in legacy if (card['status'] == 'reviewed') == confirmed]
            for index, card in enumerate(group):
                owner = TEAM_IDS[index % len(TEAM_IDS)]
                owners = [owner]
                if index % 3 == 0:
                    owners.append(TEAM_IDS[(index + 1) % len(TEAM_IDS)])
                if index == 0 and confirmed and len(group) < len(TEAM_IDS):
                    owners = list(dict.fromkeys([*owners, *TEAM_IDS[len(group):]]))
                card.update(ownerId=owner, ownerIds=owners)
        store.put_many(legacy)


class Accounts:
    def __init__(self, store):
        self.store = store

    @property
    def bootstrap_path(self):
        return self.store.directory / 'team-access.json'

    def initialize(self):
        with self.store.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                    password_hash TEXT NOT NULL, salt BLOB NOT NULL, role TEXT NOT NULL,
                    avatar_color TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
                    expires_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS team_settings (
                    key TEXT PRIMARY KEY, value TEXT NOT NULL
                );
            """)
            db.execute('BEGIN IMMEDIATE')
            if db.execute("SELECT 1 FROM team_settings WHERE key='invite_hash'").fetchone():
                db.execute("UPDATE users SET name=? WHERE id=? AND username=? AND name=?",
                           ('양승민', 'e3', 'seungmin', '유승민'))
                self.sync_bootstrap_name()
                return
            if not self.bootstrap_path.exists():
                access = dict(company=COMPANY, inviteCode=secrets.token_urlsafe(18),
                              accounts=[dict(username=username, name=name, password=secrets.token_urlsafe(15))
                                        for _, username, name in TEAM])
                temporary = self.bootstrap_path.with_suffix('.tmp')
                descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
                with os.fdopen(descriptor, 'w', encoding='utf-8') as file:
                    if os.name == 'nt':
                        restrict_windows_access(temporary)
                    json.dump(access, file, ensure_ascii=False, indent=2)
                    file.write('\n')
                temporary.replace(self.bootstrap_path)
            access = json.loads(self.bootstrap_path.read_text(encoding='utf-8'))
            passwords = {item['username']: item['password'] for item in access['accounts']}
            for index, (user_id, username, name) in enumerate(TEAM):
                self.insert(db, user_id, username, name, passwords[username],
                            'admin' if index == 0 else 'user', COLORS[index])
            db.execute('INSERT INTO team_settings VALUES (?, ?)', ('invite_hash', digest(access['inviteCode'])))

    def sync_bootstrap_name(self):
        if not self.bootstrap_path.exists():
            return
        with self.bootstrap_path.open('r+', encoding='utf-8') as file:
            access = json.load(file)
            changed = False
            for account in access.get('accounts', []):
                if account.get('username') == 'seungmin' and account.get('name') == '유승민':
                    account['name'] = '양승민'
                    changed = True
            if changed:
                file.seek(0)
                json.dump(access, file, ensure_ascii=False, indent=2)
                file.write('\n')
                file.truncate()

    @staticmethod
    def insert(db, user_id, username, name, password, role, color):
        salt = secrets.token_bytes(16)
        db.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (user_id, username, name, password_hash(password, salt), salt, role, color))

    @staticmethod
    def public(row):
        user_id, name, role, color = row
        return dict(id=user_id, name=name, role=role, avatarColor=color, company=COMPANY,
                    nameEn='', position='', department='', email='')

    def employees(self):
        with self.store.connect() as db:
            return [self.public(row) for row in db.execute(
                'SELECT id, name, role, avatar_color FROM users ORDER BY rowid')]

    def register(self, username, name, password, invite):
        username = username.strip().lower()
        name = name.strip()
        if not re.fullmatch(r'[a-z0-9][a-z0-9._-]{2,31}', username):
            raise HTTPException(422, '아이디는 영문, 숫자와 . _ - 를 사용해 3~32자로 입력하세요.')
        if not 1 <= len(name) <= 50 or any(ord(char) < 32 for char in name):
            raise HTTPException(422, '이름을 1~50자로 입력하세요.')
        if not 10 <= len(password) <= 128:
            raise HTTPException(422, '비밀번호는 10~128자로 입력하세요.')
        user_id = str(uuid4())
        color = secrets.choice(COLORS)
        with self.store.connect() as db:
            expected = db.execute("SELECT value FROM team_settings WHERE key='invite_hash'").fetchone()[0]
            if not secrets.compare_digest(digest(invite.strip()), expected):
                raise HTTPException(403, '회사 초대 코드를 확인하세요.')
            try:
                self.insert(db, user_id, username, name, password, 'user', color)
            except sqlite3.IntegrityError:
                raise HTTPException(409, '이미 사용 중인 아이디입니다.') from None
        return self.public((user_id, name, 'user', color))

    def authenticate(self, username, password):
        with self.store.connect() as db:
            row = db.execute('SELECT id, name, role, avatar_color, password_hash, salt FROM users WHERE username=?',
                             (username.strip().lower(),)).fetchone()
        candidate = password_hash(password, row[5] if row else bytes(16))
        if row is None or not secrets.compare_digest(row[4], candidate):
            raise HTTPException(401, '아이디 또는 비밀번호를 확인하세요.')
        return self.public(row[:4])

    def start_session(self, user_id, previous):
        token = secrets.token_urlsafe(32)
        timestamp = int(time.time())
        with self.store.connect() as db:
            db.execute('DELETE FROM sessions WHERE expires_at<=? OR token_hash=?', (timestamp, digest(previous)))
            db.execute('INSERT INTO sessions VALUES (?, ?, ?)', (digest(token), user_id, timestamp + SESSION_SECONDS))
        return token

    def session_user(self, token):
        if not token:
            return None
        with self.store.connect() as db:
            row = db.execute("""
                SELECT u.id, u.name, u.role, u.avatar_color FROM users u
                JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?
            """, (digest(token), int(time.time()))).fetchone()
        return self.public(row) if row else None

    def end_session(self, token):
        with self.store.connect() as db:
            db.execute('DELETE FROM sessions WHERE token_hash=?', (digest(token),))
