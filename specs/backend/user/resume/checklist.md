# Checklist: 서류 분석 API (User Resume)

> 구현 완료 후 PR 제출 전 아래 항목을 점검한다.  
> 관련 문서: `spec.md` / `constitution.md`

---

## 구현 단계별 체크리스트

| Phase | 범위 | 포함 섹션 |
|-------|------|----------|
| **Phase 1** | 인프라 & 기본 설계 | 공통 (인증·예외 처리·공통 응답) |
| **Phase 2** | 비즈니스 로직 | 이력서 업로드, 자기소개서 제출, 분석 결과 조회, 이력 목록 조회 |
| **Phase 3** | 비동기 & 실시간 | Webhook, WebSocket |
| **Phase 4** | 보안 & 테스트 | 보안, 단위 테스트, Swagger 문서 |

---

## 공통

- [ ] 모든 API는 JWT 인증 + `ROLE_USER` 권한 검증이 적용되어 있다
- [ ] `memberId`를 `@AuthenticationPrincipal`로 추출하며 Request body·Path에서 파싱하지 않는다
- [ ] Entity를 API 응답으로 직접 반환하지 않고 DTO로 변환한다
- [ ] 모든 예외는 `CustomException(ErrorCode.*)` 형식을 사용한다 (`new RuntimeException` 금지)
- [ ] Controller에 `try-catch` 블록 없이 `GlobalExceptionHandler`로 위임된다
- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼 형식을 따른다
- [ ] 에러 로깅 정책: `GlobalExceptionHandler`에서 반환하는 응답 body에 Stack Trace가 포함되지 않는다. 서버 로그에는 `documentId`와 `memberId`가 함께 기록되어 디버깅이 가능하다
- [ ] JPA N+1 방지: `getHistory` 페이징 조회 시 `JOIN FETCH` 또는 `@EntityGraph`를 사용하여 연관 데이터를 단일 쿼리로 가져온다
- [ ] 비즈니스 로깅: 분석 시작(`PENDING` 전이), Webhook 수신(`COMPLETED`/`FAILED`), 분석 실패 시점에 INFO 레벨로 `documentId`·`memberId`를 포함한 로그를 남겨 추후 ELK 등 로그 수집기로 평균 분석 소요 시간·성공률 추적이 가능하도록 한다

---

## 이력서 업로드 (`POST .../upload`)

- [ ] 파일 크기 10MB 초과 시 `INVALID_FILE_SIZE(400)` 반환
- [ ] PDF·DOC·DOCX 외 파일 타입 시 `INVALID_FILE_TYPE(400)` 반환
- [ ] MIME type 검증이 확장자가 아닌 실제 파일 속성(`Apache Tika` 또는 Magic Number) 기반으로 수행된다
- [ ] 검증 실패 시 S3 업로드가 수행되지 않는다
- [ ] S3 저장 파일명이 `{UUID}.{확장자}` 형식이며 `original_name`을 S3 키로 사용하지 않는다 (공백·특수문자 포함 파일명도 UUID로 변환되어 안전하게 저장)
- [ ] S3 저장 경로가 `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` 형식이다 (루트 직접 저장 금지)
- [ ] `file_url`, `original_name` 컬럼이 각각 올바르게 저장된다
- [ ] S3 업로드 Connection/Read Timeout이 3~5초 이내로 설정되어 있다
- [ ] `file.getInputStream()` 사용 후 스트림이 `try-with-resources` 또는 명시적 `close()`로 반드시 해제된다 (스트림 누수 방지)
- [ ] S3 업로드 성공 후 `Document` 저장 (`status = UPLOADED`)
- [ ] FastAPI 분석 트리거가 비동기(`@Async` 또는 `WebClient`)로 수행된다 (업로드 응답 지연 없음)
- [ ] 동기 호출 선택 시 Connection/Read Timeout이 3초 이내로 설정되어 있다
- [ ] 응답에 `documentId` (UUID), `fileUrl`, `originalName`, `fileType`, `status`, `createdAt` 포함

---

## 자기소개서 제출 (`POST .../cover-letter`)

- [ ] 문항 수 1개 미만 또는 6개 이상 시 `INVALID_CONTENT_COUNT(400)` 반환
- [ ] 답변 1000자 초과 시 `INVALID_CONTENT_LENGTH(400)` 반환
- [ ] `Document` 저장 시 `file_url = null`, `original_name = null` 확인
- [ ] `CoverLetterContent` 저장이 `Document`와 동일 트랜잭션 내에서 처리된다
- [ ] FastAPI 분석 트리거가 비동기로 수행된다

---

## 분석 결과 조회 (`GET .../{documentId}/feedback`)

- [ ] 존재하지 않는 `documentId` 시 `DOCUMENT_NOT_FOUND(404)` 반환
- [ ] 본인 소유가 아닌 `documentId` 시 `DOCUMENT_ACCESS_DENIED(403)` 반환 (IDOR 방어)
- [ ] 분석 미완료 시 `scores`, `feedbackDetails` 필드가 `null`로 반환된다
- [ ] `feedbackDetails` JSON 역직렬화가 정상 동작한다
- [ ] JSON 파싱 실패 시 500 서버 크래시 없이 `FEEDBACK_PARSE_ERROR` 에러 응답이 반환된다
- [ ] `GlobalExceptionHandler`에 파싱 실패 핸들러가 등록되어 있다
- [ ] `starAnalysis`, `quantAnalysis` 항목이 null인 경우 응답에서 처리된다

---

## 이력 목록 조회 (`GET .../history`)

- [ ] 본인 문서만 반환된다 (`member_id` 필터 필수)
- [ ] 최신순(`created_at DESC`) 정렬이 적용된다
- [ ] 분석 미완료 항목의 `totalScore`가 `null`로 반환된다
- [ ] `RESUME` 타입의 `company`, `job` 필드가 `null`로 반환된다
- [ ] `COVER_LETTER` 타입의 `originalName` 필드가 `null`로 반환된다
- [ ] 0-based 페이징이 정상 동작한다

---

## Webhook (`POST .../{documentId}/webhook`)

- [ ] `X-Internal-Secret` 헤더가 환경 변수 `WEBHOOK_SECRET` 값과 일치하는지 검증한다
- [ ] 헤더 누락 또는 값 불일치 시 `403 Forbidden`을 반환한다
- [ ] `WEBHOOK_SECRET` 값이 코드에 하드코딩되지 않고 환경 변수로 관리된다
- [ ] 멱등성: `document.status`가 이미 `COMPLETED`/`FAILED`인 경우 DB 갱신 없이 `200 OK`만 반환한다
- [ ] 중복 Webhook 수신 시 예외가 발생하지 않고 정상 응답한다
- [ ] `DocumentFeedback` 저장과 `document.status` 업데이트가 동일 트랜잭션으로 처리된다
- [ ] 저장 완료 후 해당 `documentId` WebSocket 구독자에게 메시지가 정상 발송된다
- [ ] `FAILED` 콜백 수신 시 `error_message`가 DB에 저장되고 WebSocket으로 전달된다
- [ ] Webhook 요청 데이터 검증: 수신된 JSON의 필수 필드(`score_*`, `feedback_text` 등)가 `null`이 아닌지 `@Valid`로 검증하여, 유실된 데이터가 DB에 저장되어 추후 조회 시 NPE가 발생하는 상황을 방지한다

---

## WebSocket (`WS /ws/resume/{documentId}/status`)

- [ ] 핸드셰이크 쿼리 파라미터 `?token=`에서 JWT를 `WebSocketHandshakeInterceptor`가 추출·검증한다
- [ ] `StompChannelInterceptor`가 CONNECT 프레임 수신 시 세션 attributes의 `Authentication`을 재검증한다
- [ ] 토큰 없음·만료 시 연결이 거부된다 (핸드셰이크 단계 HTTP 401 또는 CONNECT 프레임 거부)
- [ ] SUBSCRIBE 프레임 수신 시 구독 토픽의 `documentId` 소유권을 `DocumentRepository`로 DB 재조회하여 검증한다
- [ ] 본인 소유가 아닌 `documentId` 구독 시 Close 1008로 연결이 즉시 거부된다 (IDOR 방지 필수)
- [ ] 구독 실패(`@MessageExceptionHandler`) 시 클라이언트에게 에러 메시지를 발송하도록 구현되어 있다 (연결 성공 후 특정 토픽 구독 오류 시 사용자에게 피드백 필수)
- [ ] 연결 성공 직후 해당 `documentId`의 현재 `status`를 1회 브로드캐스트한다 (재연결 대응)
- [ ] Webhook 수신 후 `SimpMessagingTemplate`으로 해당 토픽에 메시지가 정상 발송된다
- [ ] `COMPLETED` / `FAILED` 전송 후 즉시 끊지 않고 Grace Period(30초) 타이머가 시작된다
- [ ] Grace Period 타이머는 `TaskScheduler`(또는 `ScheduledExecutorService`)로 구현한다 (`Thread.sleep` 금지)
- [ ] 클라이언트가 먼저 연결을 닫으면 `ScheduledFuture.cancel(true)`로 타이머가 취소되고 즉시 세션이 해제된다
- [ ] 30초 만료 시 서버가 Close 1000(정상 종료)으로 세션을 정리한다 (에러 코드 사용 금지)
- [ ] 세션 종료 후 `TaskScheduler` 리소스가 누수 없이 해제되는지 확인한다
- [ ] STOMP Heartbeat 설정: `registry.enableSimpleBroker().setHeartbeatValue(...)` 설정을 통해 비정상적으로 끊긴 클라이언트 연결을 즉시 감지하고 좀비 세션이 서버 메모리를 점유하지 않도록 한다
- [ ] 메시지 형식(`status`, `message`, `progress`)이 프론트 스펙과 일치한다

---

## 보안

- [ ] IDOR 방어 시나리오: 다른 회원의 `documentId`로 REST API 요청 시 403 확인
- [ ] IDOR 방어 시나리오: 다른 회원의 `documentId`로 WebSocket 연결 시도 시 Close 1008 확인
- [ ] 파일 확장자를 .pdf로 위조한 비정상 파일 업로드 시 MIME type 검증으로 차단 확인
- [ ] `WEBHOOK_SECRET` 값이 `application-prod.yml` 또는 시스템 환경 변수로 분리되고 코드·설정 파일에 평문 노출이 없는지 확인
- [ ] S3 URL 노출 최소화: `file_url` 응답 시 CloudFront 등 CDN 주소를 우선 사용한다. MVP 단계에서 직접 S3 URL 사용 시 버킷의 퍼블릭 접근 여부와 경로 예측 가능성을 검토한다 (Presigned URL은 선택사항)

---

## 단위 테스트

- [ ] `feedback_text` JSON 역직렬화 — `ObjectMapper.readValue()` → `List<FeedbackDetail>` 정상 변환 케이스
- [ ] `feedback_text` JSON 파싱 실패 시 `FEEDBACK_PARSE_ERROR(500)` 반환 (서버 크래시 없음) 케이스
- [ ] Webhook 수신 시 점수 5개 컬럼 + `feedback_text` 올바르게 저장되는지 확인
- [ ] Webhook 멱등성 — `COMPLETED` 상태에서 재수신 시 DB 갱신 없이 `200 OK` 반환 확인
- [ ] IDOR — 타인 `documentId`로 피드백 조회 시 `403` 반환 확인

---

## Swagger 문서

- [ ] `ResumeControllerDocs` 인터페이스에 모든 API Swagger 어노테이션이 분리되어 있다
- [ ] 각 API의 요청·응답 예시가 `api-schema.md`와 일치한다
- [ ] ErrorCode 목록이 Swagger 응답 예시에 포함된다
