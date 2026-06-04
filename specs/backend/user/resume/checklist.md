# Checklist: 서류 분석 API (User Resume)

> 구현 완료 후 PR 제출 전 아래 항목을 점검한다.  
> 관련 문서: `spec.md` / `constitution.md`

---

## 공통

- [ ] 모든 API는 JWT 인증 + `ROLE_USER` 권한 검증이 적용되어 있다
- [ ] `memberId`를 `@AuthenticationPrincipal`로 추출하며 Request body·Path에서 파싱하지 않는다
- [ ] Entity를 API 응답으로 직접 반환하지 않고 DTO로 변환한다
- [ ] 모든 예외는 `CustomException(ErrorCode.*)` 형식을 사용한다 (`new RuntimeException` 금지)
- [ ] Controller에 `try-catch` 블록 없이 `GlobalExceptionHandler`로 위임된다
- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼 형식을 따른다

---

## 이력서 업로드 (`POST .../upload`)

- [ ] 파일 크기 10MB 초과 시 `INVALID_FILE_SIZE(400)` 반환
- [ ] PDF·DOC·DOCX 외 파일 타입(MIME type 기반) 시 `INVALID_FILE_TYPE(400)` 반환
- [ ] 검증 실패 시 S3 업로드가 수행되지 않는다
- [ ] S3 저장 파일명이 `{UUID}.{확장자}` 형식이며 `original_name`을 S3 키로 사용하지 않는다
- [ ] `stored_file_name`, `file_url`, `original_name` 세 컬럼이 각각 올바르게 저장된다
- [ ] S3 업로드 성공 후 `Document` 저장 (`status = UPLOADED`)
- [ ] FastAPI 분석 트리거가 비동기로 수행된다 (업로드 응답 지연 없음)
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
- [ ] `feedbackDetails` JSONB 역직렬화가 정상 동작한다
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

---

## WebSocket (`WS /ws/resume/{documentId}/status`)

- [ ] `HandshakeInterceptor`에서 `token` 쿼리 파라미터 JWT 검증 및 `Authentication` 객체 세션 주입이 수행된다
- [ ] 토큰 없음·만료 시 Close 1008로 연결을 즉시 종료한다
- [ ] 유효하지 않은 `documentId` 시 Close 1008로 연결을 즉시 종료한다
- [ ] 본인 소유가 아닌 `documentId` 시 Close 1008로 연결을 즉시 종료한다
- [ ] `COMPLETED` / `FAILED` 전송 후 즉시 끊지 않고 Grace Period(30초) 타이머가 시작된다
- [ ] 클라이언트가 먼저 연결을 닫으면 타이머가 취소되고 즉시 세션이 해제된다
- [ ] 30초 만료 시 서버가 Close 1000(정상 종료)으로 세션을 정리한다 (에러 코드 사용 금지)
- [ ] 메시지 형식(`status`, `message`, `progress`)이 프론트 스펙과 일치한다

---

## 보안

- [ ] IDOR 방어 시나리오: 다른 회원의 `documentId`로 REST API 요청 시 403 확인
- [ ] IDOR 방어 시나리오: 다른 회원의 `documentId`로 WebSocket 연결 시도 시 Close 1008 확인
- [ ] 파일 확장자를 .pdf로 위조한 비정상 파일 업로드 시 MIME type 검증으로 차단 확인

---

## Swagger 문서

- [ ] `ResumeControllerDocs` 인터페이스에 모든 API Swagger 어노테이션이 분리되어 있다
- [ ] 각 API의 요청·응답 예시가 `api-schema.md`와 일치한다
- [ ] ErrorCode 목록이 Swagger 응답 예시에 포함된다
