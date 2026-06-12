# Checklist: 서류 분석 AI (FastAPI user/resume)

> 구현 완료 후 아래 항목을 모두 점검한다.
> 관련 문서: `fastapi-spec.md` / `fastapi-schema.md` / `fastapi-constitution.md`

---

## Convention 준수

- [ ] FastAPI 코드가 `fastapi/user/` 하위에 위치하는가?
- [ ] `api/` 라우터에 비즈니스 로직이 직접 작성되지 않았는가? (서비스 레이어 위임 여부)
- [ ] 모든 환경 변수 접근이 `core/config.py` 설정 계층을 통해 이루어지는가?
- [ ] `admin/` 패키지를 `user/` 에서 직접 참조하지 않는가?
- [ ] 임시 파일이 분석 완료·실패 후 즉시 삭제되는가?

## 내부 인증

- [ ] `POST /internal/user/resume/analyze` 수신 시 `X-Internal-Secret` 헤더가 검증되는가?
- [ ] 헤더 누락 또는 불일치 시 `403` 반환되는가?
- [ ] FastAPI → Spring Webhook 콜백 전송 시 `X-Internal-Secret` 헤더가 포함되는가?
- [ ] `WEBHOOK_SECRET` 값이 코드 또는 로그에 노출되지 않는가?

## 비동기 처리

- [ ] 분석 트리거 수신 후 `202 Accepted`를 즉시 반환하는가? (동기 블로킹 없음)
- [ ] 분석이 BackgroundTasks 또는 asyncio 기반으로 비동기 처리되는가?

## Webhook 콜백

- [ ] PENDING 콜백이 분석 시작 직후 전송되는가?
- [ ] ANALYZING 콜백이 단계별로 전송되는가? (`progress` 값이 단계별로 증가하는가?)
- [ ] COMPLETED 콜백에 점수 5개, `overallReview`, `feedbackText`, `errorMessage: null`이 포함되는가?
- [ ] FAILED 콜백에 점수 5개가 `null`, `errorMessage`가 문자열로 포함되는가?
- [ ] Webhook 콜백 실패 시 최대 3회 재시도 후 에러 로그를 기록하는가?
- [ ] 3회 재시도 모두 실패 시 후속 동작이 정의되어 있는가? (예: ERROR 레벨 로그 + 운영팀 알림 또는 자동 FAILED 전환)

## feedbackText 직렬화 계약

- [ ] `feedbackText`가 `FeedbackDetail[]` JSON 직렬화 문자열인가?
- [ ] Spring Boot `ObjectMapper.readValue(feedbackText, FeedbackDetail[].class)` 역직렬화 가능한가? (로컬 테스트 확인)
- [ ] 이력서 `feedbackDetails` 각 항목에 `starAnalysis` (S·T·A·R 4개 항목)가 포함되는가?
- [ ] 자기소개서 `feedbackDetails` 각 항목의 `starAnalysis`가 `null`인가?
- [ ] `sectionNumber`가 1부터 시작하는 연속 정수인가?
- [ ] 자기소개서 `feedbackDetails` 항목 수가 `content[]` 배열 길이와 같은가?
- [ ] 각 `FeedbackDetail`에 `sectionNumber`, `question`, `originalText`, `goodPoint`, `badPoint`, `improvedText` 필드가 모두 포함되는가?

## 점수 범위

- [ ] `scoreJobFitness`, `scoreTechStack`, `scoreQuantified`, `scoreLogical`, `scoreTotal`이 모두 0~100 정수인가?

## 파일 파싱

- [ ] PDF 파일에서 텍스트가 정상 추출되는가?
- [ ] DOCX 파일에서 텍스트가 정상 추출되는가?
- [ ] 암호화 PDF 또는 이미지 기반 PDF 업로드 시 FAILED 콜백이 전송되는가?
- [ ] S3 다운로드 실패 시 FAILED 콜백이 전송되는가?

## 에러 처리

- [ ] OpenAI 타임아웃 또는 API 오류 발생 시 FAILED 콜백이 전송되는가?
- [ ] 동일 `documentId` 중복 요청 시 `409` 또는 무시 처리가 되는가?
- [ ] 모든 오류 케이스에서 에러 로그(ERROR 레벨)가 기록되는가?

## Spring Boot 연동

- [ ] Spring Boot `POST /api/v1/user/resume/{documentId}/webhook` 수신 후 DB 상태가 업데이트되는가?
- [ ] WebSocket `/topic/resume/{documentId}/status`로 메시지가 브로드캐스트되는가?
- [ ] ANALYZING 중간 콜백 수신 시 WebSocket 메시지가 전송되는가?
- [ ] WebSocket 브로드캐스트가 트랜잭션 커밋 이후(`@TransactionalEventListener` 등)에 호출되는가? (DB 반영 전 프론트 수신 방지)
- [ ] WebSocket으로 전송되는 메시지 구조가 `status`, `progress`, `result`(또는 null)를 포함한 통합 스키마를 사용하는가?
- [ ] WebSocket 페이로드 필드명이 프론트엔드 상태 관리(Zustand 등)의 상태값과 1:1 매핑되는지 프론트엔드 담당자와 사전 합의되었는가?

## 데이터 정합성

- [ ] Spring Boot Webhook 수신 시, 현재 DB 상태보다 이전 상태(예: COMPLETED 이후 도착한 ANALYZING)는 무시하는 로직이 있는가? (Out-of-order Webhook 방지)
- [ ] Spring Boot에서 분석 요청 후 일정 시간(예: 30분) 이내에 COMPLETED 또는 FAILED 콜백이 오지 않으면 FAILED 처리하는 감시 배치(Watchdog)가 있는가? (Zombie Task 방지)

## 사용자 경험

- [ ] FastAPI가 전송하는 `errorMessage`가 사용자에게 노출 가능한 친화적 문구인가? (예: `"파일 형식이 올바르지 않습니다"` — 내부 스택 트레이스 미포함)
- [ ] 에러 매핑 시스템: 파싱 오류·API 오류·네트워크 오류 등 모든 예외를 사용자 인지 가능한 공통 메시지군(5~6개)으로 매핑하고 있는가?
- [ ] 보안 처리: `errorMessage`에 서버 파일 경로, Python 스택 트레이스, DB 쿼리 등 내부 정보가 포함되지 않는가?
- [ ] Fallback 메시지: 예기치 못한 예외 발생 시 빈 문자열 대신 기본 메시지(예: `"분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."`)를 반환하는가?
- [ ] 에러 계층 분리: `logger.error(..., exc_info=True)`로 개발자용 스택 트레이스를 서버 로그에 기록하고, `errorMessage`에는 사용자용 문구만 포함하는가?
- [ ] Error Registry: 에러 코드 → 사용자 메시지 매핑이 `if-else` 분산 없이 중앙 테이블(예: `ERROR_MESSAGES` dict)로 관리되는가?
