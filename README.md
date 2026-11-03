# ThinkTree Business Network

[명함 원본 및 OCR 테스트 결과 목록](backend/EVALUATION_RESULTS.md)에서 명함 20개의 원본 이미지, 인식 텍스트, JSON, 인식 영역 이미지를 확인할 수 있습니다.

[전체 OCR 테스트 HTML 보고서](backend/OCR_테스트_결과.html)는 내려받아 브라우저로 열어주세요. 기존 테스트 결과를 포함했으며 새 OCR이나 외부 AI 호출은 수행하지 않았습니다.

## UI에서 원본과 OCR 결과 확인

프로젝트 루트에서 PowerShell로 `.\start.ps1`을 실행하고 http://localhost:8443 에 접속합니다. 로그인 후 **Incoming Cards → 기존 OCR 테스트 명함**을 선택하면 제공된 명함 20장이 사진과 함께 표시됩니다.

이미 서버가 실행 중이면 시작 스크립트가 기존 서버를 감지하고 접속 주소를 표시합니다. 반복 실행해도 서버를 중복 실행하지 않습니다. 다른 프로그램이 포트를 사용 중일 때는 해당 프로그램을 종료하지 않고 안내합니다.

명함 사진이나 목록 행을 클릭하면 원본 사진, OCR 원문, 모델별 신뢰도, 내용 포함률·문자 정확도·줄 일치율, 인식 영역 이미지를 확인할 수 있습니다. 사진을 다시 클릭하면 확대되며 원본 크기로 새 창에서 열 수도 있습니다. 상단 **전체 OCR 보고서**에서 기존 HTML 보고서를 열 수 있습니다.

기존 자료는 서버 시작 시 `backend/cards`와 `backend/out`에서 한 번 불러옵니다. **기존 OCR 자료 불러오기** 버튼은 새로 추가한 자료를 불러오며 기존 수정·확정 내역을 덮어쓰거나 중복 등록하지 않습니다. 반려한 자료도 자동으로 재등록하지 않습니다. 등록 데이터는 `backend/runtime`에 저장됩니다.

정답지 원문은 로컬에 유지합니다. 정답지가 없는 환경에서도 기존 테스트 지표를 볼 수 있도록 `backend/evaluation_metrics.json`에 저장된 OCR 결과와 연결된 요약 지표를 포함했습니다. 새 OCR·외부 AI 호출은 수행하지 않습니다.

검증: `frontend`에서 `pnpm typecheck`, `pnpm test`, `pnpm build`; UI/API 실행 후 `pnpm test:evaluation`. API 테스트는 `backend`에서 `.\.venv\Scripts\python.exe -m unittest test_api`로 실행합니다.
