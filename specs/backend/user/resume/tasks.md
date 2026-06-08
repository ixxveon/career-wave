# Tasks: 서류 분석 API (User Resume)

> 관련 문서: `plan.md` / `spec.md`  
> 레이어: **Backend (Spring Boot)**

---

## Phase 1: 도메인 기반 세팅

- [ ] `FileType` Enum 작성 (`RESUME`, `COVER_LETTER`)
- [ ] `DocumentStatus` Enum 작성 (`UPLOADED`, `PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`)
- [ ] `Document` Entity 작성
  - UUID PK (`document_id`, DEFAULT gen_random_uuid())
  - `member_id` UUID NOT NULL, `file_type` VARCHAR(20) NOT NULL
  - `file_url` VARCHAR(500) NOT NULL, `original_name` VARCHAR(200) NOT NULL
  - `created_at` TIMESTAMPTZ NOT NULL
  - `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
- [ ] `CoverLetterMeta` Entity 작성
  - BIGSERIAL PK (`letter_meta_id`), `document_id` UUID NOT NULL
  - `company` VARCHAR(100) NOT NULL, `job` VARCHAR(100) NOT NULL, `created_at`
- [ ] `CoverLetterContent` Entity 작성
  - BIGSERIAL PK (`content_id`), `document_id` UUID NOT NULL
  - `order_num` INTEGER NOT NULL (CHECK 1~5), `question` TEXT NOT NULL, `answer` TEXT NOT NULL
  - UNIQUE 제약: `CONSTRAINT uq_clc_document_order UNIQUE (document_id, order_num)`
- [ ] `DocumentFeedback` Entity 작성
  - BIGSERIAL PK (`document_feedback_id`), `document_id` UUID NOT NULL UNIQUE (1:1)
  - `feedback_details` JSONB NOT NULL — `AttributeConverter` 적용, `created_at`
- [ ] `DocumentRepository` 작성
- [ ] `CoverLetterMetaRepository` 작성
- [ ] `CoverLetterContentRepository` 작성
- [ ] `DocumentFeedbackRepository` 작성
- [ ] `ErrorCode` 추가
  - `INVALID_FILE_SIZE` (400)
  - `INVALID_FILE_TYPE` (400)
  - `INVALID_CONTENT_COUNT` (400)
  - `INVALID_CONTENT_LENGTH` (400)
  - `DOCUMENT_NOT_FOUND` (404)
  - `DOCUMENT_ACCESS_DENIED` (403)

---

## Phase 2: 이력서 업로드 API

- [ ] `ResumeDTO.ResponseUpload` 작성
- [ ] 파일 MIME type 기반 확장자 검증 유틸 작성 (PDF·DOC·DOCX)
  - 단순 확장자(.pdf) 체크는 우회 가능 — 파일 Magic Number 또는 Apache Tika로 실제 MIME 검증 권장
- [ ] 파일 크기 10MB 초과 검증
- [ ] UUID 기반 저장 파일명 생성 유틸 작성 (`{UUID}.{확장자}`)
- [ ] S3 경로 생성 로직 작성 (`resumes/{yyyy-MM-dd}/{UUID}.{확장자}` — `LocalDate.now()` 활용)
- [ ] S3 업로드 로직 구현 — `stored_file_name` 사용, `original_name` DB 별도 저장
- [ ] `Document` 저장 (`status = UPLOADED`, `file_type = RESUME`)
- [ ] FastAPI 분석 트리거 (비동기, 스텁 → 실제 연동)
- [ ] `ResumeController.uploadResume()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 3: 자기소개서 제출 API

- [ ] `ResumeDTO.RequestCoverLetter`, `ResumeDTO.ResponseCoverLetter` 작성
- [ ] `@Valid` + `@Size` 기반 문항 수(1~5), 답변 길이(1000자) 검증
- [ ] `Document` 저장 (`status = UPLOADED`, `file_type = COVER_LETTER`, `file_url = null`)
- [ ] `CoverLetterContent` 벌크 저장 (`@Transactional`)
  - `saveAll()` 호출 시 `member_id`·`document_id` 매핑 로그 남기기 — 디버깅 편의
- [ ] FastAPI 분석 트리거 (비동기)
- [ ] `ResumeController.submitCoverLetter()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 4: 분석 결과 조회 API

- [ ] `ResumeDTO.ResponseFeedback` 및 중첩 record 작성
  - `ScoreDetail`, `FeedbackDetail`, `StarAnalysis`, `QuantAnalysis`, `AnalysisItem`
- [ ] JSONB `feedback_details` 역직렬화 처리 — `AttributeConverter` 구현 (`hypersistence-utils` 사용 시 팀 합의 필요)
- [ ] `JsonProcessingException` 캐치 후 `CustomException(ErrorCode.FEEDBACK_PARSE_ERROR)` 변환 — 서버 크래시 방지
- [ ] `GlobalExceptionHandler`에 `FEEDBACK_PARSE_ERROR` 핸들러 등록 ("분석 결과 변환 중 오류가 발생했습니다" 메시지 반환)
- [ ] IDOR 검증 — `document.member_id != memberId` 시 `DOCUMENT_ACCESS_DENIED(403)`
- [ ] `DocumentFeedback` 없는 경우 status만 포함한 응답 반환
- [ ] `ResumeController.getFeedback()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 5: 이력 목록 조회 API

- [ ] `ResumeDTO.HistoryItem` 작성
- [ ] `DocumentRepository` 커스텀 쿼리 작성 (member_id + created_at DESC + LEFT JOIN feedback)
- [ ] `PaginationResponse<ResumeDTO.HistoryItem>` 변환
- [ ] `ResumeController.getHistory()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 6: Webhook 수신 API (FastAPI → Spring)

- [ ] `ResumeDTO.RequestWebhook` DTO 작성 (`status`, `scores`, `feedbackDetails`, `errorMessage`)
- [ ] `X-Internal-Secret` 헤더 검증 구현 — 환경 변수 `WEBHOOK_SECRET` 값과 비교, 불일치 시 `403` 반환
- [ ] 멱등성 처리 — `document.status`가 이미 `COMPLETED`/`FAILED`이면 DB 갱신 없이 `200 OK` 즉시 반환
- [ ] `DocumentFeedback` 저장 + `document.status` 업데이트 (`@Transactional`)
- [ ] DB 커밋 완료 후 WebSocket 브로드캐스트 — `@TransactionalEventListener(phase = AFTER_COMMIT)` 사용
  - 서비스 내부에서 `ApplicationEventPublisher.publishEvent()`로 이벤트 발행
  - 이벤트 리스너에서 `SimpMessagingTemplate.convertAndSend()` 호출
  - ⚠️ `SimpMessagingTemplate`을 `@Transactional` 메서드 안에서 직접 호출 금지
- [ ] `ResumeController.receiveWebhook()` 구현

---

## Phase 7: WebSocket 분석 상태 구독

- [ ] `WebSocketConfig` 설정 클래스 작성 (STOMP 엔드포인트 `/ws/resume` 등록, 토픽 prefix `/topic` 설정)
- [ ] `ChannelInterceptor` 구현
  - CONNECT 프레임 수신 시 헤더의 JWT 검증
  - 검증 실패 시 `MessageDeliveryException` 으로 연결 거부
  - 검증 성공 시 `Authentication` 객체를 세션에 주입
- [ ] `documentId` 소유권 검증 — SUBSCRIBE 프레임 수신 시 구독 토픽의 `documentId`와 인증 유저 비교
- [ ] Webhook 수신 후 `SimpMessagingTemplate.convertAndSend("/topic/resume/{documentId}/status", message)` 연동
- [ ] `COMPLETED` / `FAILED` 전송 후 Grace Period 30초 타이머 시작
  - `Thread.sleep` 금지 — `TaskScheduler` 사용
  - `scheduler.schedule()` 반환값 `ScheduledFuture` 보관
  - 클라이언트가 먼저 연결을 닫으면 `ScheduledFuture.cancel(true)` 호출 후 즉시 세션 해제
  - 30초 만료 시 Close 1000으로 서버에서 세션 정리
- [ ] STOMP 구독 토픽 `/topic/resume/{documentId}/status` 동작 확인

---

## Phase 8: 검증 및 문서화

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger UI에서 요청·응답 예시 확인
- [ ] IDOR 시나리오 수동 테스트 (타인 documentId로 요청 시 403 확인)
- [x] 프론트 Base URL 일치 확인 — `/api/v1/user/resume` 통일 완료
- [ ] 파일 MIME type 검증 우회 시도 테스트

---

## 권장 구현 시작 순서

> 설계 Phase 순서와 별개. 실제 코딩 시작 시 아래 순서로 진행하면 흐름 검증이 빠르다.

```
[Step 1]  Phase 1 (엔티티 · Repository · ErrorCode)
              ↓
          Phase 2 (이력서 업로드 API)
              ↓
          검증: 프론트 → Spring → S3 흐름 확인
              - S3 경로가 resumes/{날짜}/{UUID}.{확장자}로 저장되는가
              - DB에 Document가 UPLOADED 상태로 저장되는가
              - 응답에 documentId(UUID)가 내려오는가

[Step 2]  Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
              ↑
          Phase 4 진입 전, FastAPI 팀과 feedback_details JSONB 스키마 합의 필수
```
