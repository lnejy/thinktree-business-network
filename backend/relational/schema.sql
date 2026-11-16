-- 확정된 명함(cards.sqlite3 의 status='reviewed')에서 다시 만들어지는 조회용 관계형 테이블.
-- 원본은 cards.sqlite3 이며, 이 파일(relational.sqlite3)은 지워도 서버가 시작할 때 다시 만든다.
-- id 는 frontend/src/cardApi.ts 가 쓰는 값과 같다: company-<명함id>, contact-<명함id>, 사업소 = <회사id>/<사업소명>, 부서 = <상위id>/<부서명>

CREATE TABLE company (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,            -- 가장 최근 명함의 회사명(화면 표시용)
  name_key TEXT NOT NULL,        -- 정규화한 회사명(비교용)
  domain TEXT,
  address TEXT,
  registration_no TEXT,
  homepage_url TEXT
);
CREATE TABLE site (               -- 사업소/지점(본사 포함). 명함에 없으면 '사업소 미확인'
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id),
  name TEXT NOT NULL,
  address TEXT, tel TEXT, fax TEXT
);
CREATE TABLE department (         -- 부서 계층. parent_id 가 NULL 이면 사업소 바로 아래
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES site(id),
  parent_id TEXT REFERENCES department(id),
  name TEXT NOT NULL,
  level INTEGER NOT NULL
);
CREATE TABLE person (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id),   -- 가장 최근 명함 기준 현재 회사
  name TEXT, name_en TEXT, department TEXT, team TEXT, position TEXT,
  phone TEXT, mobile TEXT, email TEXT,
  owner_ids TEXT NOT NULL        -- JSON: 이 사람의 명함을 등록한 직원들
);
CREATE TABLE card (               -- 소속 이력의 한 지점: 한 사람의 한 장 명함
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES person(id),
  company_id TEXT NOT NULL REFERENCES company(id),
  site_id TEXT NOT NULL REFERENCES site(id),
  department_id TEXT REFERENCES department(id),      -- 가장 아래 부서. 부서가 없으면 NULL
  owner_id TEXT,
  effective_date TEXT,           -- 사용자가 입력한 기준일(확인된 날짜). 없으면 NULL
  card_date TEXT NOT NULL,       -- 기준일 또는 등록일(추정). effective_date 가 NULL 이면 추정 날짜
  uploaded_at TEXT NOT NULL,
  reviewed_at TEXT,
  person_link TEXT, company_link TEXT,               -- 사용자가 정한 연결(명함id 또는 'separate')
  person_reasons TEXT NOT NULL, company_reasons TEXT NOT NULL,   -- JSON: 연결된 이유(근거 문구)
  fields TEXT NOT NULL,          -- JSON: 확정된 필드 값
  department_path TEXT NOT NULL  -- JSON: 부서 경로
);
CREATE TABLE connection (         -- 직원 ↔ 거래처 인물 (Business Network)
  employee_id TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES person(id),
  PRIMARY KEY (employee_id, person_id)
);
CREATE INDEX card_person ON card(person_id);
CREATE INDEX card_company ON card(company_id);
