# Tasks: 서류 분석 API (User Resume)

> 관련 문서: `plan.md` / `spec.md`  
> 레이어: **Backend (Spring Boot)**

---

## Phase 1: 도메인 기반 세팅

- [x] `FileType` Enum 작성 (`RESUME`, `COVER_LETTER`)
- [x] `DocumentStatus` Enum 작성 (`UPLOADED`, `PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`)
- [x] `Document` Entity 작성
  - UUID PK (`document_id`, DEFAULT gen_random_uuid())
  - `member_id` UUID NOT NULL, `file_type` VARCHAR(20) NOT NULL
  - `file_url` VARCHAR(500) NULL, `original_name` VARCHAR(200) NULL (RESUME 필수, COVER_LETTER는 null — 애플리케이션 레벨 보장)
  - `created_at` TIMESTAMPTZ NOT NULL
  - `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
- [x] `CoverLetterMeta` Entity 작성
  - BIGSERIAL PK (`letter_meta_id`), `document_id` UUID NOT NULL
  - `company` VARCHAR(100) NOT NULL, `job` VARCHAR(100) NOT NULL, `created_at`
- [x] `CoverLetterContent` Entity 작성
  - BIGSERIAL PK (`content_id`), `document_id` UUID NOT NULL
  - `order_num` INTEGER NOT NULL (CHECK 1~5), `question` TEXT NOT NULL, `answer` TEXT NOT NULL
  - UNIQUE 제약: `(document_id, order_num)`
- [x] `DocumentFeedback` Entity 작성
  - BIGSERIAL PK (`document_feedback_id`), `document_id` UUID NOT NULL
  - `score_job_fitness`, `score_tech_stack`, `score_quantified`, `score_logical`, `score_total` INTEGER (nullable)
  - `feedback_text` TEXT NOT NULL, `created_at`
- [x] `DocumentRepository` 작성
- [x] `CoverLetterMetaRepository` 작성
- [x] `CoverLetterContentRepository` 작성
- [x] `DocumentFeedbackRepository` 작성
- [x] `ResumeErrorCode` 작성 (`user/resume/exception/ResumeErrorCode.java`, `BaseErrorCode` 구현)
  - `INVALID_FILE_SIZE` (400)
  - `INVALID_FILE_TYPE` (400)
  - `INVALID_CONTENT_COUNT` (400)
  - `INVALID_CONTENT_LENGTH` (400)
  - `DUPLICATE_CONTENT_ORDER` (400)
  - `DOCUMENT_NOT_FOUND` (404)
  - `DOCUMENT_ACCESS_DENIED` (403)
  - `FEEDBACK_PARSE_ERROR` (500)
  - `WEBHOOK_SECRET_INVALID` (403)
  - `WEBHOOK_INVALID_STATUS` (400)
- [x] `BaseErrorCode` 인터페이스 작성 (`global/exception/BaseErrorCode.java`)
- [x] `CustomException`, `GlobalExceptionHandler` → `BaseErrorCode` 기반으로 리팩토링

---

## Phase 2: 이력서 업로드 API

- [x] `ResumeDTO.ResponseUpload` 작성
- [x] 파일 MIME type 기반 확장자 검증 유틸 작성 (PDF·DOC·DOCX)
  - `Apache Tika` (`org.apache.tika:tika-core`) 사용 확정 — `Tika.detect(InputStream)`으로 실제 MIME 검증
  - `build.gradle`에 의존성 추가 후 팀 공유
- [x] 파일 크기 10MB 초과 검증
- [x] UUID 기반 저장 파일명 생성 유틸 작성 (`{UUID}.{확장자}`)
- [x] S3 경로 생성 로직 작성 (`resumes/{yyyy-MM-dd}/{UUID}.{확장자}` — `LocalDate.now()` 활용)
- [x] S3 업로드 로직 구현 — `original_name` DB 별도 저장
- [x] `Document` 저장 (`status = UPLOADED`, `file_type = RESUME`)
- [x] FastAPI 분석 트리거 — `WebClient` 비동기 호출 (3초 타임아웃, 실패 시 FAILED 마킹)
- [x] `ResumeController.uploadResume()` 구현
- [x] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 3: 자기소개서 제출 API

- [x] `ResumeDTO.RequestCoverLetter`, `ResumeDTO.ResponseCoverLetter` 작성
- [x] `@Valid` + `@Size` 기반 문항 수(1~5), 답변 길이(1000자) 검증
- [x] `Document` 저장 (`status = UPLOADED`, `file_type = COVER_LETTER`, `file_url = null`)
- [x] `CoverLetterMeta` 저장 (company, job)
- [x] `CoverLetterContent` 벌크 저장 (`saveAll()`, `@Transactional`)
- [x] FastAPI 분석 트리거 (비동기)
- [x] `ResumeController.submitCoverLetter()` 구현
- [x] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 4: 분석 결과 조회 API

- [x] `ResumeDTO.ResponseFeedback` + `ScoreDTO`, `FeedbackDetail`, `StarAnalysis`, `QuantAnalysis` inner record 작성
- [x] `DocumentFeedback` 조회 → score 컬럼 5개 `ScoreDTO`로 매핑
- [x] `feedback_text`(TEXT) → `ObjectMapper.readValue()` → `List<FeedbackDetail>` 역직렬화
- [x] `JsonProcessingException` 캐치 후 `CustomException(ResumeErrorCode.FEEDBACK_PARSE_ERROR)` 변환
- [x] IDOR 검증 — `findByDocumentIdAndMemberId()` DB 레벨 차단, 불일치 시 `DOCUMENT_ACCESS_DENIED(403)`
- [x] `DocumentFeedback` 없는 경우 scores·feedbackDetails·overallReview null 반환
- [x] `ResumeController.getFeedback()` 구현
- [x] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 5: 이력 목록 조회 API

- [x] `ResumeDTO.HistoryItem` 작성
- [x] `DocumentRepository` 커스텀 쿼리 작성 (member_id + created_at DESC, document_id DESC + LEFT JOIN feedback)
- [x] `PaginationResponse<ResumeDTO.HistoryItem>` 변환
- [x] `ResumeController.getHistory()` 구현
- [x] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 6: Webhook 수신 API (FastAPI → Spring)

- [x] `ResumeDTO.RequestWebhook` DTO 작성 (`status`, `scoreJobFitness`, `scoreTechStack`, `scoreQuantified`, `scoreLogical`, `scoreTotal`, `overallReview`, `feedbackText`, `errorMessage`)
- [x] `X-Internal-Secret` 헤더 검증 구현 — 환경 변수 `WEBHOOK_SECRET` 값과 비교, 불일치 시 `403` 반환
- [x] 멱등성 처리 — `document.status`가 이미 `COMPLETED`/`FAILED`이면 DB 갱신 없이 `200 OK` 즉시 반환
- [x] `DocumentFeedback` 저장 + `document.status` 업데이트 (`@Transactional`)
- [x] DB 커밋 완료 후 WebSocket 브로드캐스트 — `@TransactionalEventListener(phase = AFTER_COMMIT)` 사용
  - 서비스 내부에서 `ApplicationEventPublisher.publishEvent()`로 이벤트 발행
  - 이벤트 리스너에서 `SimpMessagingTemplate.convertAndSend()` 호출 (Phase 7에서 리스너 구현)
  - ⚠️ `SimpMessagingTemplate`을 `@Transactional` 메서드 안에서 직접 호출 금지
- [x] `ResumeController.receiveWebhook()` 구현 (`POST /api/v1/user/resume/{documentId}/webhook`)
- [x] `COMPLETED`·`FAILED` 외 알 수 없는 status 값은 `WEBHOOK_INVALID_STATUS(400)` 예외 처리

---

## Phase 7: WebSocket 분석 상태 구독

- [x] `WebSocketConfig` 설정 클래스 작성
  - STOMP 엔드포인트 `/ws/user/resume` 등록, 토픽 prefix `/topic` 설정
  - `ResumeHandshakeInterceptor` + `ResumeStompChannelInterceptor` 등록
- [x] `ResumeHandshakeInterceptor` 구현
  - `beforeHandshake()`: 쿼리 파라미터 `?token=` 추출 → JWT 검증 → `memberId` 세션 attributes 저장
  - 검증 실패 시 `false` 반환으로 핸드셰이크 거부
- [x] `ResumeStompChannelInterceptor` 구현
  - CONNECT 프레임: 세션 attributes의 `memberId` 재검증, 실패 시 `MessageDeliveryException` 거부
  - SUBSCRIBE 프레임: 구독 토픽의 `documentId` 소유권을 `DocumentRepository`로 DB 재조회 (IDOR 방지)
- [x] SUBSCRIBE 직후 현재 `document.status` Snapshot 1회 브로드캐스트 (재연결 대응)
- [x] Webhook 수신 후 `SimpMessagingTemplate.convertAndSend("/topic/resume/{documentId}/status", message)` 연동
  - `DocumentAnalysisEventListener` — `@TransactionalEventListener(AFTER_COMMIT)` 에서 브로드캐스트
- [x] `COMPLETED` / `FAILED` 전송 후 Grace Period 30초 타이머 시작
  - `Thread.sleep` 금지 — `TaskSchedulerConfig`(`ThreadPoolTaskScheduler`) 빈 등록
  - `scheduler.schedule()` 반환값 `ScheduledFuture` 보관 (`ConcurrentHashMap` 관리)
  - 클라이언트가 먼저 연결을 닫으면 `cancelGracePeriod()` → `ScheduledFuture.cancel(true)`
  - 30초 만료 시 `WebSocketSessionRegistry.closeSession()` → `session.close(CloseStatus.NORMAL)` (Close 1000, SESSION_CLOSE 메시지 전송 방식 미사용)
- [x] 클라이언트 연결 종료 감지: `ApplicationListener<SessionDisconnectEvent>` 구현 → `sessionDocumentMap`(ConcurrentHashMap)으로 sessionId→documentId 역추적 → `cancelGracePeriod()` 호출
- [x] `WebSocketSessionRegistry` 구현 — sessionId→WebSocketSession, documentId→sessionId 양방향 매핑 관리
- [x] `ResumeWebSocketHandlerDecoratorFactory` 구현 — `afterConnectionEstablished` / `afterConnectionClosed` 에서 registry 등록/해제
- [x] `WebSocketConfig`에 `WebSocketHandlerDecoratorFactory` 등록 + `/queue` 브로커 prefix 추가 + userDestinationPrefix("/user") 설정
- [x] SUBSCRIBE 직후 Snapshot을 구독한 세션에만 `convertAndSendToUser`로 `/user/queue/resume/{documentId}/status` 전송 (전체 브로드캐스트 금지)
- [x] `WebSocketConfig.setAllowedOriginPatterns()` → 환경 변수 `WEBSOCKET_ALLOWED_ORIGINS` 주입 (기본값 `*`)
- [x] 30초 만료 시 `WebSocketSessionRegistry.closeSession(documentId)` 호출 → `session.close(CloseStatus.NORMAL)` (Close 1000)
- [x] STOMP 구독 토픽 이중 구조 확정: `/topic/resume/{documentId}/status` (브로드캐스트) + `/user/queue/resume/{documentId}/status` (개인 Snapshot)

---

## Phase 8: 검증 및 문서화

- [x] `spec.md` 패키지 구조·API 명세·ErrorCode 실제 구현 기준으로 업데이트
- [x] 전체 테스트 suite 통과 확인 (`./gradlew test` BUILD SUCCESSFUL)
- [x] `checklist.md` 셀프 체크 완료 (하단 참조)
- [x] 프론트 Base URL 일치 확인 — `/api/v1/user/resume` 통일 완료
- [x] Swagger UI에서 요청·응답 예시 확인 (DB 연동 후 수동 검증)
- [x] IDOR 시나리오 수동 테스트 (타인 documentId로 요청 시 403 확인)
- [x] 파일 MIME type 검증 우회 시도 테스트 (확장자 위조 파일 업로드)
- [x] SecurityConfig `permitAll("/api/v1/user/resume/**")` 제거

---

### Phase 8 체크리스트 셀프 체크

| 항목 | 결과 |
|------|------|
| Controller에서 Entity 직접 반환 없음 | ✅ DTO(record) 반환 |
| 모든 API 응답 `ApiResponse<T>` 사용 | ✅ |
| `RuntimeException` 직접 생성 없음 | ✅ `CustomException(ResumeErrorCode.xxx)` |
| Entity `@NoArgsConstructor(PROTECTED)` | ✅ |
| Entity setter 미사용, 의미 있는 메서드로 상태 변경 | ✅ `markFailed()`, `updateStatus()` |
| PK 전략 `GenerationType.IDENTITY` + Long (또는 UUID) | ✅ Document: UUID, 나머지: IDENTITY+Long |
| Swagger 인터페이스 분리 (`docs/ResumeControllerDocs.java`) | ✅ |
| N+1 쿼리 없음 (이력 조회 JPQL LEFT JOIN) | ✅ |
| 페이지네이션 있는 목록 조회 | ✅ `PaginationResponse` |
| IDOR — DB 레벨 `findByDocumentIdAndMemberId` | ✅ |
| WebSocket SUBSCRIBE IDOR 방지 | ✅ `ResumeStompChannelInterceptor` |
| `@Transactional` 메서드에서 WebSocket 직접 호출 없음 | ✅ `@TransactionalEventListener(AFTER_COMMIT)` |
| 환경 변수 하드코딩 없음 | ✅ `application.properties` + `.env` |
| 보안 정보 커밋 없음 | ✅ `.gitignore` 확인 완료 |

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
