# Tasks: 서류 분석 AI (FastAPI user/resume)

> 관련 문서: `fastapi-plan.md` / `fastapi-spec.md` / `fastapi-schema.md`

---

## Phase 1: 기반 설정

- [x] `fastapi/core/config.py` — Settings 클래스 작성
  - `SPRING_BASE_URL`, `WEBHOOK_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, AWS S3 환경 변수 로딩
  - `pydantic-settings` 또는 `python-dotenv` 기반 (팀 의존성 확인 필요)
- [x] `X-Internal-Secret` 헤더 검증 FastAPI 의존성 함수 작성
  - 헤더 누락 또는 값 불일치 시 `403 Forbidden` 반환
  - `core/` 또는 공통 미들웨어 위치에 배치
- [x] `fastapi/user/service/webhook_client.py` 작성
  - `httpx.AsyncClient` 비동기 POST 구현
  - 재시도 3회 지수 백오프 구현 (1s → 2s → 4s)
  - `X-Internal-Secret` 헤더 자동 포함
  - 모든 재시도 실패 시 ERROR 로그 기록

---

## Phase 2: 분석 트리거 라우터

- [ ] `fastapi/user/api/resume_router.py` — Pydantic 요청 모델 정의
  - `AnalyzeResumeRequest` (RESUME용: `documentId`, `fileType`, `fileUrl`, `originalName`)
  - `AnalyzeCoverLetterRequest` (COVER_LETTER용: `documentId`, `fileType`, `company`, `job`, `content[]`)
  - 또는 Union 타입 단일 모델 + `fileType` discriminator
- [ ] `POST /internal/user/resume/analyze` 엔드포인트 구현
  - `X-Internal-Secret` 검증 의존성 주입
  - `BackgroundTasks.add_task()`로 분석 서비스 비동기 실행
  - `202 Accepted` 즉시 반환
  - 동일 `documentId` 중복 요청 처리 (처리 중 판단 로직)
- [ ] `fastapi/main.py`에 라우터 등록
  - `app.include_router(resume_router.router, prefix="/internal/user")`
  - 기존 주석 처리된 라우터 등록 패턴 참고

---

## Phase 3: 파일 파싱 서비스

- [ ] `fastapi/user/service/file_parser.py` 작성
  - `boto3.client('s3')`로 S3 파일 스트림 다운로드
  - PDF 텍스트 추출 (`pdfplumber` 사용)
  - DOCX 텍스트 추출 (`python-docx` 사용)
  - 암호화 PDF 또는 텍스트 추출 불가 파일 → `FileParseError` 예외 발생
  - 임시 파일 생성 시 `finally` 블록에서 반드시 삭제

---

## Phase 4: 프롬프트 및 AI 분석 서비스

- [ ] `fastapi/user/prompts/resume_prompts.py` — 프롬프트 템플릿 정의
  - 이력서 분석 시스템 프롬프트 (STAR 분석, 수치화 분석 포함)
  - 자기소개서 분석 시스템 프롬프트 (회사·직무 컨텍스트, STAR 분석 제외)
  - 점수 기준 설명 (0~100 각 항목별 평가 기준)
  - JSON 형식 응답 강제 (`response_format` 또는 프롬프트 내 JSON 스키마 명시)
- [ ] `fastapi/user/service/resume_service.py` 작성
  - 분석 오케스트레이션 함수 (`analyze_document(request)`)
  - 분석 시작 시 `logger.info(f"Analysis started for {document_id}")` 로그 기록 — 컨테이너 재시작/OOM 발생 시 디버깅 기준점
  - PENDING 콜백 전송 (분석 시작 직후)
  - RESUME 분기: `file_parser.py` 호출 → ANALYZING 콜백 전송 → OpenAI 분석
  - COVER_LETTER 분기: ANALYZING 콜백 전송 → OpenAI 분석
  - OpenAI 응답 파싱 → `FeedbackDetail[]` 생성
  - `feedbackText`: `json.dumps(feedback_details, ensure_ascii=False)` 직렬화
  - COMPLETED 또는 FAILED 콜백 전송 시 `logger.info(f"Analysis completed/failed for {document_id}")` 로그 기록
  - OpenAI 응답의 `completion.usage`에서 토큰 소모량 추출 → `logger.info(f"[{document_id}] Token Usage: {usage}")` 기록 (비용 분석 원천 데이터)
  - 모든 오류 (`FileParseError`, `OpenAI 타임아웃` 등) → FAILED 콜백 + ERROR 로그
  - 컨테이너 비정상 종료 시 Spring Boot의 Watchdog 배치(30분 타임아웃)가 FAILED 처리하는 것을 전제로 한다 — FastAPI 자체 복구 로직은 MVP 범위 외

---

## Phase 5: 검증 및 문서화

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] `fastapi/tests/fixtures/` 디렉토리 생성 및 테스트 픽스처 작성
  - `mock_resume_request.json` — RESUME 타입 분석 트리거 요청 샘플
  - `mock_cover_letter_request.json` — COVER_LETTER 타입 분석 트리거 요청 샘플
  - `mock_completed_webhook.json` — COMPLETED 콜백 페이로드 샘플
  - `mock_failed_webhook.json` — FAILED 콜백 페이로드 샘플
- [ ] 로컬 통합 테스트 (위 픽스처 활용)
  - `POST /internal/user/resume/analyze` (RESUME 타입) — Webhook 콜백 수신 확인
  - `POST /internal/user/resume/analyze` (COVER_LETTER 타입) — Webhook 콜백 수신 확인
  - `X-Internal-Secret` 누락 시 `403` 응답 확인
  - FAILED 케이스 시뮬레이션 (잘못된 fileUrl 전달)
- [ ] Spring Boot 연동 테스트
  - `feedbackText` JSON이 Spring `ObjectMapper.readValue(feedbackText, FeedbackDetail[].class)` 역직렬화 가능한지 확인
  - WebSocket 브로드캐스트 정상 수신 확인 (분석 진행 → 완료)
