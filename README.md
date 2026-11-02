# ThinkTree 명함 OCR 통합

기존 CardSync UI에 PaddleOCR 명함 인식과 검토·저장을 연결한 로컬 개발 버전입니다. PDF의 Business Network 과제를 적용했습니다. 첨부 Word는 별도 SpecPilot 과제이므로 이번 구현에서 제외했습니다. 상세 범위와 분석은 [통합 계획](INTEGRATION_PLAN.md)을 참고하세요.

## 실행

현재 PC에는 의존성을 설치했습니다. 아래 명령을 C:\thinkTree에서 실행합니다.

```powershell
.\start.ps1
```

화면: http://localhost:8443 / API 설명: http://127.0.0.1:8000/docs

서버를 따로 실행하려면 두 터미널에서 다음 명령을 사용합니다.

```powershell
cd C:\thinkTree\backend
.\.venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8000
```

```powershell
cd C:\thinkTree\frontend
pnpm dev
```

처음 설치하는 PC는 Python 3.11 또는 3.12, Node 22.12 이상, pnpm을 준비하고 다음을 실행합니다. 기존 backend/venv는 다른 PC의 경로를 참조하므로 사용하지 않습니다.

```powershell
cd C:\thinkTree
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\api-requirements.txt
cd frontend
pnpm install
```

## 사용 흐름

1. 기존 시연 계정으로 로그인합니다. 로그인은 실제 인증이 아닙니다.
2. Add Card에서 파일을 선택하거나 모바일 카메라로 사진을 촬영합니다. JPG/PNG/WEBP/BMP, 최대 15MB, 2,500만 화소 이하입니다. HEIC는 JPG로 변환해야 합니다.
3. 언어와 구조화 방식을 선택하고 OCR 인식을 시작합니다. 자동은 기존 한국어/기본 모델을 비교합니다. 일본어/영어는 해당 언어를 명시적으로 선택할 수 있습니다. 최초 모델 실행에는 인터넷 다운로드가 필요합니다.
4. OCR은 서버에서 순차 처리합니다. 다른 화면으로 이동해도 계속되며 Incoming Cards에서 상태 확인·실패 재시도가 가능합니다. 처리 중 서버가 종료되면 다음 시작 시 실패 상태로 전환하여 재시도할 수 있습니다.
5. 원본 이미지, OCR 원문, 최초 구조화 JSON, 주의사항을 비교하고 필드를 수정합니다. 초안을 저장하거나 회사명·이름을 입력하고 확정합니다. 이메일·전화번호 형식도 검사합니다. 반려는 검토 대기 명함과 원본을 삭제합니다.
6. 확정한 정보가 내 명함·기업·연락처·검색·조직도·네트워크에 반영됩니다. 조직도는 사업소와 부서의 전체 부모 경로로 구분하며 직책은 인물에 표시합니다.

가상 명함 2개의 **저장된 샘플**도 등록 화면에서 불러올 수 있습니다. 해당 버튼은 새 OCR이나 외부 API를 호출하지 않으며 샘플임을 표시합니다. 원래 UI에 있던 예시 데이터는 보존되어 함께 표시됩니다. 예시 명함은 서버에 저장된 데이터가 아니므로 저장·재시도·삭제 대상이 아닙니다.

## OCR 및 AI

- 기본 `local`: 로컬 PaddleOCR와 보수적인 규칙으로 이메일·전화번호·URL·명시된 이름/회사명 등을 추출합니다. 추측하지 않으므로 회사명·이름·조직 등이 공란일 수 있으며 사용자가 입력해야 합니다.
- `gemini` / `claude`: 기존 backend/ocr_extract.py의 엔진과 스키마를 재사용합니다. backend/.env의 해당 API 키를 서버에서만 읽습니다. **사용자가 엔진을 선택하고 인식을 시작한 요청**에 한해 이미지와 원문을 외부 서비스로 전송합니다. 실패하면 로컬 결과를 보존하고 경고를 표시합니다.
- 기존 테스트 파일의 기본 모델명은 유지했습니다. 서버 환경변수 `THINKTREE_GEMINI_MODEL`, `THINKTREE_CLAUDE_MODEL`로 사용 가능한 모델을 지정할 수 있습니다. 외부 API의 실제 호출·과금 검증은 수행하지 않았습니다.
- 평균 OCR 점수와 개별 필드 검증은 구분합니다. 자동 추출 필드는 Medium/Low, 사용자가 수정한 필드는 High로 표시합니다. 값이 없는 필드는 낮은 신뢰도로 표시됩니다.
- FAX·우편번호·추가 주소는 검토/저장/상세 조회가 가능합니다. 원래 구조화 스키마의 별칭·추가 연락처·손글씨 여부 등은 최초 JSON에도 보존됩니다.

## 데이터

실제 등록 데이터와 원본: `backend/runtime/cards.sqlite3`, `backend/runtime/images/`. 두 경로는 버전 관리에서 제외했습니다. 서버를 재시작해도 남습니다. 기존 cards/gt/out/demo 파일은 수정하지 않습니다. runtime 폴더를 백업하면 등록 데이터도 백업할 수 있습니다.

기업은 정규화한 회사명/별칭을 확인하고 충돌하는 도메인을 구분합니다. 도메인이 없을 때는 주소도 확인합니다. 같은 도메인이라는 이유만으로 다른 회사명이나 공용 이메일 사용자를 병합하지 않습니다. 인물은 기업·이름·이메일/휴대전화가 일치할 때 연결합니다. 모호한 기업 통합과 관리자 병합은 원래 시연 UI의 범위이며 운영용 병합 기능은 추가 구현이 필요합니다.

## 검증 명령

```powershell
cd C:\thinkTree\backend
.\.venv\Scripts\python.exe -m unittest test_api -v
cd ..\frontend
pnpm test
pnpm typecheck
pnpm build
# API와 UI를 실행한 상태에서, Windows Edge 사용
pnpm test:e2e
```

브라우저 테스트는 `ThinkTree UI Test <시간>` 회사명의 가상 명함을 등록합니다. 테스트 후 해당 데이터는 남습니다. 테스트 스크린샷은 실행 폴더의 test-results에 저장합니다.

## 개발 범위

기존 로그인/관리자 권한은 화면 시연 수준입니다. 로컬 API는 인증 없는 개발용이며 기본 실행은 127.0.0.1로 제한합니다. 사내 운영 배포에는 실제 인증·사용자별 권한·개인정보 관리와 다중 프로세스 작업 큐가 추가로 필요합니다. 원래 UI의 다른 시연 버튼(관리자 병합/설정 등)을 운영 기능으로 전환하는 작업은 이번 OCR 통합 범위에 포함하지 않았습니다.

API 구현은 [FastAPI 파일 업로드](https://fastapi.tiangolo.com/tutorial/request-files/)와 [PaddleOCR 공식 사용법](https://paddlepaddle.github.io/PaddleOCR/main/en/version3.x/pipeline_usage/OCR.html)을 참고했습니다.
