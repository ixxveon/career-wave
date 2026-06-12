# Implementation Plan: 서류 분석 AI (FastAPI user/resume)

> 관련 문서: `fastapi-spec.md` / `fastapi-schema.md` / `fastapi-tasks.md`
> 레이어: **FastAPI (AI 엔진)**

---

## Summary

Spring Boot로부터 서류 분석 트리거를 수신하고, 이력서 파일 파싱 또는 자기소개서 텍스트 입력을 기반으로
OpenAI 분석을 수행한 뒤 단계별 Webhook 콜백으로 Spring Boot에 결과를 전달하는 FastAPI 모듈 구현 계획.

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 분석 트리거 수신 | `POST /internal/user/resume/analyze` | Spring Boot 내부 호출 전용, 비동기 202 응답 |
| 비동기 처리 | FastAPI `BackgroundTasks` | 즉시 응답 후 백그라운드 분석 |
| 파일 파싱 (PDF) | **팀 합의 필요** — `PyMuPDF` 또는 `pdfplumber` 후보 | 텍스트 추출 정확도 및 암호화 PDF 처리 여부 확인 필요 |
| 파일 파싱 (DOCX) | **팀 합의 필요** — `python-docx` 후보 | 팀 Python 의존성 목록 확인 필요 |
| AI 분석 | OpenAI API (`openai` SDK) | 기존 프로젝트 방향성 기준 |
| 내부 인증 | `X-Internal-Secret` 헤더 | Spring Boot와 동일 시크릿 공유 |
| Webhook 재시도 | 최대 3회 지수 백오프 | Spring 일시 다운 대응 |
| 환경 변수 | `core/config.py` Settings 클래스 | Convention § 12 준수 |

---

## 전제 조건 및 미결 사항

| 항목 | 상태 | 비고 |
|------|------|------|
| 파일 파싱 라이브러리 | **팀 합의 필요** | `PyMuPDF`, `pdfplumber`, `python-docx` 중 결정 |
| OpenAI 모델 선택 | **팀 합의 필요** | `gpt-4o`, `gpt-4o-mini` 등 비용/품질 트레이드오프 |
| 분석 프롬프트 설계 | **FastAPI 팀 작성 필요** | `user/prompts/resume_prompts.py`에 프롬프트 템플릿 정의 |
| S3 접근 방식 | **확정** | FastAPI가 환경 변수 자격증명으로 직접 S3 접근 (`boto3`) |
| Webhook 콜백 URL | **확정** | `{SPRING_BASE_URL}/api/v1/user/resume/{documentId}/webhook` |
| 내부 인증 방식 | **확정** | `X-Internal-Secret` 헤더, `WEBHOOK_SECRET` 환경 변수 |
| DB 직접 접근 | **확정** | 금지 — Webhook 콜백 패턴으로만 상태 전달 |

---

## 필요 환경 변수

| 환경 변수 | 설명 | 담당 |
|-----------|------|------|
| `SPRING_BASE_URL` | Spring Boot 내부 URL | 본인 직접 설정 |
| `WEBHOOK_SECRET` | 내부 인증 공유 키 | Spring Boot와 동일 값으로 설정 |
| `OPENAI_API_KEY` | OpenAI API 키 | 인프라 팀 요청 |
| `OPENAI_MODEL` | 사용 모델명 | 팀 합의 후 설정 |
| `AWS_ACCESS_KEY_ID` | S3 Access Key | 인프라 팀 요청 |
| `AWS_SECRET_ACCESS_KEY` | S3 Secret Key | 인프라 팀 요청 |
| `AWS_REGION` | S3 리전 | 인프라 팀 요청 |
| `AWS_S3_BUCKET_NAME` | S3 버킷명 | 인프라 팀 요청 |

---

## Phases

### Phase 1: 기반 설정

- [ ] `fastapi/core/config.py` — Settings 클래스 작성 (환경 변수 로딩)
- [ ] `X-Internal-Secret` 헤더 검증 의존성 함수 작성 (`core/` 또는 공통 미들웨어)
- [ ] `fastapi/user/service/webhook_client.py` — Spring Webhook 콜백 HTTP 클라이언트 작성
  - `httpx.AsyncClient` 비동기 POST
  - 재시도 3회 지수 백오프 (`tenacity` 또는 직접 구현)
  - `X-Internal-Secret` 헤더 자동 포함

### Phase 2: 분석 트리거 라우터

- [ ] `fastapi/user/api/resume_router.py` — `POST /internal/user/resume/analyze` 구현
  - `X-Internal-Secret` 검증 의존성 주입
  - Request Pydantic 모델 작성 (RESUME / COVER_LETTER 분기)
  - `BackgroundTasks`로 분석 서비스 비동기 실행
  - `202 Accepted` 즉시 반환
- [ ] `fastapi/main.py`에 라우터 등록: `app.include_router(resume_router.router, prefix="/internal/user")`

### Phase 3: 파일 파싱 서비스

- [ ] `fastapi/user/service/file_parser.py` — S3 다운로드 + 텍스트 추출 서비스
  - `boto3`로 S3에서 파일 스트림 다운로드
  - PDF 파싱 (팀 합의 라이브러리 확정 후 구현)
  - DOCX 파싱 (팀 합의 라이브러리 확정 후 구현)
  - 텍스트 추출 실패 시 `FileParseError` 예외 발생
  - 임시 파일 사용 시 처리 후 즉시 삭제

### Phase 4: 프롬프트 및 AI 분석 서비스

- [ ] `fastapi/user/prompts/resume_prompts.py` — 분석 프롬프트 템플릿 정의
  - 이력서 분석 프롬프트 (STAR 분석 포함)
  - 자기소개서 분석 프롬프트 (회사·직무 컨텍스트 포함)
  - 점수 산출 기준 정의
- [ ] `fastapi/user/service/resume_service.py` — 분석 오케스트레이션
  - PENDING 콜백 전송
  - RESUME: 파일 파싱 → ANALYZING 콜백 → AI 분석 → COMPLETED/FAILED 콜백
  - COVER_LETTER: ANALYZING 콜백 → AI 분석 → COMPLETED/FAILED 콜백
  - `FeedbackDetail[]` 직렬화 → `feedbackText` JSON 문자열 생성
  - 오류 발생 시 FAILED 콜백 전송

### Phase 5: 검증 및 문서화

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] `POST /internal/user/resume/analyze` 로컬 테스트 (RESUME + COVER_LETTER 각각)
- [ ] Spring Boot 연동 테스트: Webhook 콜백 수신 여부 확인
- [ ] `feedbackText` JSON 역직렬화 가능 여부 Spring Boot에서 확인

---

## 전략적 개발 순서 권장

```
Phase 1 (기반 설정) → Phase 2 (라우터) → Phase 3 (파일 파싱) → Phase 4 (AI 분석) → Phase 5 (검증)
```

**Phase 2 스텁 전략**: AI 분석 미구현 상태에서도 Webhook 콜백 흐름 검증 가능하도록,
Phase 2~3 완료 후 고정 mock 응답으로 COMPLETED 콜백을 보내는 스텁 서비스를 먼저 작성한다.
Spring Boot 측 Webhook 수신 + WebSocket 연동을 선행 검증한 뒤 Phase 4에서 실제 AI 분석으로 교체한다.
