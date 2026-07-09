# Spec: 서류 분석 API (User Resume)

**Feature Branch**: `docs/backend-user-resume-spec`
**버전**: v1
**Status**: 스펙 작성 중
**참조 프론트 스펙**: `specs/frontend/user/resume/`

---

## 도메인 개요

회원이 이력서(파일 업로드) 또는 자기소개서(문항·답변 직접 입력)를 제출하면
FastAPI AI 서비스가 분석하여 직무 적합도 및 항목별 피드백 리포트를 제공하는 REST + WebSocket API.

- 모든 API는 JWT 인증 + `ROLE_USER` 권한 필수
- `memberId`는 토큰에서 추출하며 Request body에 포함하지 않음
- `documentId`는 UUID v4 사용 — 순차 PK 노출 방지
- FastAPI 분석 작업 트리거 및 결과 수신은 서버 내부 처리 (프론트 직접 호출 없음)

---

## ERD

### documents

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `document_id` | UUID | PK, DEFAULT gen_random_uuid() | 문서 고유 식별자 |
| `member_id` | UUID | NOT NULL | 회원 FK |
| `file_type` | VARCHAR(20) | NOT NULL | `RESUME` \| `COVER_LETTER` |
| `file_url` | VARCHAR(500) | NULL | S3 저장 파일 URL (COVER_LETTER는 null) |
| `original_name` | VARCHAR(200) | NULL | 업로드 원본 파일명 (COVER_LETTER는 null) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'UPLOADED' | `UPLOADED` \| `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `error_message` | TEXT | NULL | 분석 실패 시 오류 메시지 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 업로드 일시 |

> S3 저장 시 `original_name`을 그대로 파일명으로 사용하지 않는다.  
> 한글·특수문자 파일명 깨짐 방지를 위해 S3 키는 `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` 형식으로 생성.  
> `file_url`에는 완성된 S3 URL, `original_name`에는 사용자 원본 파일명을 별도 저장.  
> `RESUME`이면 두 컬럼 모두 NOT NULL, `COVER_LETTER`이면 두 컬럼 모두 NULL — 애플리케이션 레벨에서 보장.

### document_feedbacks

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `document_feedback_id` | BIGSERIAL | PK | 서류 피드백 고유 식별자 |
| `document_id` | UUID | NOT NULL | 문서 FK |
| `score_job_fitness` | INTEGER | | 직무 적합도 점수 (0~100) |
| `score_tech_stack` | INTEGER | | 기술 스택 점수 (0~100) |
| `score_quantified` | INTEGER | | 경험 수치화 점수 (0~100) |
| `score_logical` | INTEGER | | 논리력 점수 (0~100) |
| `score_total` | INTEGER | | 종합 점수 (0~100) |
| `feedback_text` | TEXT | NOT NULL | AI 서류 피드백 텍스트 |
| `overall_review` | TEXT | NULL | AI 종합 총평 |
| `recommended_keywords` | TEXT | NULL | 추천 키워드 JSON 배열 문자열 (예: `["Spring Boot","Redis"]`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |

> 점수 컬럼 5개는 분석 완료 전까지 `null`. FastAPI Webhook 수신 시 저장됨.  
> `feedback_text`는 항목별 첨삭 배열(`feedbackDetails`)을 JSON 직렬화한 문자열로 확정.  
> Spring에서 `ObjectMapper.readValue()`로 역직렬화하여 `ResponseFeedback.feedbackDetails`로 반환.  
> `overall_review`는 FastAPI Webhook이 함께 전달하는 AI 종합 총평 — `ResponseFeedback.overallReview`로 반환.  
> `recommended_keywords`는 FastAPI가 분석 완료 시 전달하는 직무 핵심 키워드 목록 — JSON 배열 문자열로 저장, `ResponseFeedback.recommendedKeywords`로 반환.

### cover_letter_meta

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `letter_meta_id` | BIGSERIAL | PK | 자소서 고유 식별자 |
| `document_id` | UUID | NOT NULL | 문서 FK |
| `company` | VARCHAR(100) | NOT NULL | 지원 회사명 |
| `job` | VARCHAR(100) | NOT NULL | 지원 직무명 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |

### cover_letter_contents

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `content_id` | BIGSERIAL | PK | 문항 고유 식별자 |
| `document_id` | UUID | NOT NULL | 문서 FK |
| `order_num` | INTEGER | NOT NULL, CHECK (1~5) | 문항 순서 |
| `question` | TEXT | NOT NULL | 문항 내용 |
| `answer` | TEXT | NOT NULL | 답변 내용 (max 1000자) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |
| UNIQUE | `(document_id, order_num)` | | 동일 문서 내 순서 중복 방지 |

---

## 패키지 구조

```text
user/resume/
├── controller/
│   └── ResumeController.java
├── service/
│   ├── ResumeService.java              ← 인터페이스
│   ├── FileValidator.java              ← Tika MIME 검증 + 크기 검증
│   ├── FastApiClient.java              ← FastAPI 분석 트리거 (WebClient)
│   └── impl/
│       └── ResumeServiceImpl.java      ← 구현체
├── dto/
│   └── ResumeDTO.java
├── entity/
│   ├── Document.java
│   ├── CoverLetterMeta.java
│   ├── CoverLetterContent.java
│   └── DocumentFeedback.java
├── repository/
│   ├── DocumentRepository.java
│   ├── CoverLetterMetaRepository.java
│   ├── CoverLetterContentRepository.java
│   └── DocumentFeedbackRepository.java
├── exception/
│   └── ResumeErrorCode.java        ← resume 전용 에러코드 (BaseErrorCode 구현)
├── type/
│   ├── FileType.java
│   └── DocumentStatus.java
└── docs/
    └── ResumeControllerDocs.java

global/
├── exception/
│   └── BaseErrorCode.java          ← 도메인별 ErrorCode 공통 인터페이스
├── s3/
│   ├── S3Config.java               ← AWS S3Client 빈 등록
│   └── S3Uploader.java             ← S3 업로드 (resumes/{날짜}/{UUID}.{확장자})
└── config/
    └── WebSocketConfig.java        ← STOMP 엔드포인트 등록, broker prefix 설정

user/resume/websocket/              ← resume 전용 WebSocket 인프라
├── ResumeHandshakeInterceptor.java  (?token 쿼리 파라미터 JWT 검증, memberId 세션 주입)
├── ResumeStompChannelInterceptor.java (CONNECT 재검증, SUBSCRIBE IDOR 검증, Snapshot 전송, DisconnectEvent 처리)
├── DocumentAnalysisEventListener.java (@TransactionalEventListener AFTER_COMMIT 브로드캐스트, Grace Period 타이머)
├── WebSocketSessionRegistry.java   (sessionId↔WebSocketSession / documentId↔sessionId 양방향 매핑, session.close 호출)
├── ResumeWebSocketHandlerDecoratorFactory.java (afterConnectionEstablished/Closed에서 Registry 등록/해제)
└── WebSocketMessage.java           (payload DTO — documentId, status: ANALYZING|COMPLETED|FAILED)
```

**WebSocketConfig 주요 설정:**
- STOMP 엔드포인트: `/ws/user/resume`
- Simple Broker prefix: `/topic`, `/queue`
- User Destination prefix: `/user`
- `setAllowedOriginPatterns`: 환경 변수 `WEBSOCKET_ALLOWED_ORIGINS` 주입 (기본값 `*`)

---

## DTO 구조

### ResumeDTO.java

```java
public class ResumeDTO {

    // 이력서 업로드 응답
    public record ResponseUpload(
        UUID documentId,
        String status,          // UPLOADED
        String fileUrl,
        String originalName,
        String fileType,        // RESUME
        ZonedDateTime createdAt
    ) {}

    // 자기소개서 제출 요청
    public record RequestCoverLetter(
        @NotBlank String company,
        @NotBlank String job,
        @NotNull @Size(min = 1, max = 5) List<ContentItem> content
    ) {
        public record ContentItem(
            @Min(1) @Max(5) int order,
            @NotBlank String question,
            @NotBlank @Size(max = 1000) String answer
        ) {}
    }

    // 자기소개서 제출 응답
    public record ResponseCoverLetter(
        UUID documentId,
        String status,          // UPLOADED
        String fileType,        // COVER_LETTER
        ZonedDateTime createdAt
    ) {}

    // 분석 결과 조회 응답
    // DB score_* 컬럼 5개 → ScoreDTO로 감싸 반환 (필드명 camelCase 변환)
    // feedback_text(TEXT) → ObjectMapper 역직렬화 → feedbackDetails 배열로 반환
    // overall_review(TEXT) → overallReview 필드로 반환
    // recommended_keywords(TEXT) → ObjectMapper 역직렬화 → List<String>으로 반환
    // documents.error_message → errorMessage 필드로 반환
    public record ResponseFeedback(
        UUID documentId,
        String status,
        ScoreDTO scores,                           // null: 분석 미완료
        String overallReview,                      // null: 분석 미완료 — document_feedbacks.overall_review
        List<FeedbackDetail> feedbackDetails,      // null: 분석 미완료, feedback_text JSON 파싱 결과
        List<String> recommendedKeywords,          // null: 분석 미완료 — document_feedbacks.recommended_keywords
        String errorMessage,                       // null: 정상 완료 — documents.error_message
        ZonedDateTime createdAt
    ) {

        // DB score_* 컬럼 → 프론트 scores 중첩 객체 매핑
        // score_job_fitness → jobFitness, score_tech_stack → techStack
        // score_quantified → quantifiedAchievement, score_logical → logicalStructure
        public record ScoreDTO(
            Integer jobFitness,
            Integer techStack,
            Integer quantifiedAchievement,
            Integer logicalStructure,
            Integer total
        ) {}

        // @JsonIgnoreProperties(ignoreUnknown = true) 적용 필수
        // → FastAPI가 필드를 추가해도 Spring 서버 크래시 없이 알려진 필드만 매핑
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record FeedbackDetail(
            int sectionNumber,
            String question,
            String originalText,
            String goodPoint,
            String badPoint,
            String improvedText,
            StarAnalysis starAnalysis,   // 이력서 전용, 자기소개서는 null
            QuantAnalysis quantAnalysis  // 항목별 null 허용
        ) {}
    }

    // 이력 목록 조회 응답 (단건)
    public record HistoryItem(
        UUID documentId,
        String fileType,
        String status,
        String originalName,    // 자기소개서: null (cover_letter_meta 참조)
        String company,         // 이력서: null (cover_letter_meta 참조)
        String job,             // 이력서: null (cover_letter_meta 참조)
        Integer scoreTotal,     // 분석 미완료: null (document_feedbacks.score_total)
        ZonedDateTime createdAt
    ) {}
}
```

---

## API 명세 (요약)

```http
POST /api/v1/user/resume/upload
      Content-Type: multipart/form-data
      → ApiResponse<ResumeDTO.ResponseUpload>
      파일 검증 (10MB / PDF·DOC·DOCX / MIME type) → UUID 파일명 생성 → S3 업로드
      → Document 저장 → FastAPI 분석 비동기 트리거

POST /api/v1/user/resume/cover-letter
      Content-Type: application/json
      → ApiResponse<ResumeDTO.ResponseCoverLetter>
      문항·답변 검증 → Document + CoverLetterContent 저장 → FastAPI 분석 비동기 트리거

GET  /api/v1/user/resume/{documentId}/feedback
      → ApiResponse<ResumeDTO.ResponseFeedback>
      IDOR 검증 (소유자 일치) → DocumentFeedback 조회

GET  /api/v1/user/resume/history?page=0&size=10
      → ApiResponse<PaginationResponse<ResumeDTO.HistoryItem>>
      본인 문서 최신순 페이징 조회

POST /api/v1/user/resume/webhook                      [FastAPI → Spring 내부 전용]
      X-Internal-Secret: {WEBHOOK_SECRET}
      → 분석 완료 콜백 수신 → DB 상태 업데이트 → WebSocket으로 프론트 알림

STOMP /ws/user/resume?token={accessToken}
      구독 ① /topic/resume/{documentId}/status       ← Webhook 수신 후 브로드캐스트
      구독 ② /user/queue/resume/{documentId}/status  ← SUBSCRIBE 직후 1회 개인 Snapshot (재연결 대응)
      → 분석 상태 실시간 메시지 (ANALYZING / COMPLETED / FAILED)
```

> 상세 요청·응답 계약은 `api-schema.md` 참조.

---

## 서비스 로직

### ResumeService

#### uploadResume(UUID memberId, MultipartFile file)
- 파일 크기 10MB 초과 → `INVALID_FILE_SIZE(400)`
- 확장자 PDF·DOC·DOCX 외 → `INVALID_FILE_TYPE(400)`
  - **MIME type 기반 검증 필수** — 확장자 위조 파일 차단 목적
  - `Apache Tika` (`org.apache.tika:tika-core:3.2.2`) 사용 확정 — `build.gradle` 의존성 추가 완료
  - `Tika.detect(InputStream)` 으로 `application/pdf` 등 실제 MIME 확인
- **검증 통과 후** UUID 기반 저장 파일명 생성 (`{UUID}.{확장자}`)
- S3 저장 경로: `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` — 날짜별 폴더로 파일 분산 관리
- S3 업로드 후 `file_url`, `original_name` 저장 (S3 Connection Timeout 3~5초 설정 필수)
- `Document` 저장 (`status = UPLOADED`)
- FastAPI 분석 트리거 비동기 호출 (`@Async` + `WebClient` 또는 별도 스레드)
  - 동기 호출 시 반드시 Connection/Read Timeout 3초 이내 설정 — 미설정 시 FastAPI 지연이 Spring 전체 지연으로 전파
  - 202 Accepted 기대, 호출 실패(타임아웃·5xx) 시 → `document.status = FAILED` 마킹 + 에러 로그 기록
- 반환: `ResumeDTO.ResponseUpload`

#### submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto)
- 문항 수 1~5개 외 → Bean Validation `@Size(min=1, max=5)` 에서 400 반환 (메시지: "자기소개서 문항은 1개 이상 5개 이하로 입력해주세요.")
- 답변 1000자 초과 → Bean Validation `@Size(max=1000)` 에서 400 반환 (메시지: "자기소개서 답변은 1000자를 초과할 수 없습니다.")
- `Document` 저장 (`status = UPLOADED`, `file_url = null`)
- `CoverLetterContent` 벌크 저장
- FastAPI 분석 트리거 호출 → 202 Accepted 기대
- FastAPI 호출 실패 시 → `document.status = FAILED` 마킹 + 에러 로그 기록
- 반환: `ResumeDTO.ResponseCoverLetter`

#### getFeedback(UUID memberId, UUID documentId)
- Document 존재하지 않음 → `DOCUMENT_NOT_FOUND(404)`
- 소유자 불일치 → `DOCUMENT_ACCESS_DENIED(403)`
- `DocumentFeedback` 조회 — 없으면 `scores`, `feedbackDetails` 모두 `null`로 반환 (status만 포함)
- `feedback_text`(TEXT) → `ObjectMapper.readValue(feedbackText, FeedbackDetail[].class)` 역직렬화
- JSON 파싱 실패 시 → `FEEDBACK_PARSE_ERROR(500)` + 사용자 친화적 메시지 반환 (서버 전체 크래시 방지)
  - 이 에러는 클라이언트 문제가 아니라 FastAPI ↔ Spring 데이터 계약 파손 신호 — 서버 로그에 `documentId`·실패 원인을 ERROR 레벨로 반드시 기록
  - TODO(v2): Slack 등 운영 알림 연동 검토 — 파싱 실패 발생 즉시 담당자에게 알림
- 반환: `ResumeDTO.ResponseFeedback`

#### getHistory(UUID memberId, int page, int size)
- `member_id = memberId` 필터 필수
- `created_at DESC` 정렬
- 반환: `PaginationResponse<ResumeDTO.HistoryItem>`

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|-----------|------|-----------|
| `INVALID_FILE_SIZE` | 400 | 파일 크기 10MB 초과 |
| `INVALID_FILE_TYPE` | 400 | PDF·DOC·DOCX 외 확장자 |
| `DUPLICATE_CONTENT_ORDER` | 400 | 자기소개서 문항 순서(order) 중복 |
| `DOCUMENT_NOT_FOUND` | 404 | 존재하지 않는 documentId |
| `DOCUMENT_ACCESS_DENIED` | 403 | 본인 소유가 아닌 문서 접근 (IDOR) |
| `FEEDBACK_PARSE_ERROR` | 500 | feedback_text JSON 역직렬화 실패 (FastAPI 응답 구조 변경 등) |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |
| `WEBHOOK_SECRET_INVALID` | 403 | 유효하지 않은 Webhook 인증 키 |
| `S3_UPLOAD_FAILED` | 500 | S3 파일 업로드 실패 |

> `MaxUploadSizeExceededException` (Tomcat 레벨 파일 크기 초과) 은 `GlobalExceptionHandler`에서 별도 처리하여 400 반환.  
> 실제 업로드 상한은 `spring.servlet.multipart.max-file-size=10MB` / `max-request-size=11MB`(Spring)이 강제하며, `server.tomcat.max-swallow-size=11MB`는 초과 요청을 Tomcat이 배수(drain)하는 동작만 제어한다 — 미설정 시 Tomcat이 응답 전송 전에 커넥션을 끊어 클라이언트가 "Failed to fetch" 수신.

---

## Assumptions

- S3 업로드 방식: 서버 경유 방식으로 확정 (프론트 → Spring → S3)
- FastAPI 분석 트리거: Spring → FastAPI 분석 요청 후, FastAPI 완료 시 `POST .../webhook` 콜백 호출
- WebSocket 구현: STOMP (`spring-boot-starter-websocket`) + `ChannelInterceptor` 확정
- `document_feedbacks` 데이터는 Webhook 콜백 수신 시 Spring이 DB에 저장 후 WebSocket 알림 발송
- `FAILED` 상태의 재시도 정책은 v1 범위 외 (실패 시 UI에서 재업로드 유도)
- **`documentId` 생성 주체**: Spring 서버가 DB 저장 시 `gen_random_uuid()`로 생성 — 클라이언트 측 UUID 사전 생성 방식(Client-side generation) 사용하지 않음. 클라이언트는 `POST` 응답의 `documentId`를 수신하여 이후 API 및 WebSocket 연결에 사용
- 자기소개서 수정(Update) API는 v1 미지원 — 수정 필요 시 재제출로 처리
- members 테이블 PK는 UUID (`gen_random_uuid()`) — `document.member_id` FK 타입 동일하게 UUID 적용
- `documents` 테이블에 `error_message TEXT NULL` 컬럼 추가 — 분석 `FAILED` 시 오류 메시지 저장, 정상 완료 시 `null`
- `document_feedbacks` 테이블에 `overall_review TEXT NULL` 컬럼 추가 — FastAPI가 Webhook으로 전달하는 AI 종합 총평 저장
- `document_feedbacks` 테이블에 `recommended_keywords TEXT NULL` 컬럼 추가 — FastAPI가 분석 완료 시 전달하는 직무 핵심 키워드 목록(JSON 배열 문자열) 저장 (#873)

---

## 로컬 개발 환경 설정

### S3 Mock 업로드

AWS 자격증명 없이 로컬에서 Swagger 테스트 시 `.env`에 아래 값을 추가한다.

```properties
AWS_S3_MOCK_UPLOAD=true
```

`true`로 설정하면 실제 S3 업로드 없이 가짜 URL(`https://dummy-bucket.s3...`)을 반환한다.  
기본값 `false` — 프로덕션 환경에서는 해당 환경변수를 설정하지 않으면 자동으로 실제 S3 업로드 동작.

### JWT 인증

`ResumeController`는 `@AuthenticationPrincipal AuthPrincipal principal`로 `memberId`를 추출한다.  
Phase 8에서 `tempMemberId` 임시 코드는 완전히 제거되었으며, JWT 필터(`JwtAuthenticationFilter`)가 모든 `/api/v1/user/**` 요청에 적용된다.

로컬 개발 시 Swagger에서 테스트하려면 `POST /api/v1/user/members/login` 로그인 후 발급된 Access Token을 Bearer 헤더에 설정한다.

---

## 구현 주의사항

### 1. 트랜잭션 고립 (Partial Update 방지)

Webhook 처리 시 `document.status` 업데이트와 `document_feedbacks` 저장은 반드시 **하나의 `@Transactional`** 로 묶는다.  
둘 중 하나만 성공하는 부분 저장(Partial Update) 상태가 발생하면 DB와 클라이언트 상태가 영구적으로 불일치한다.

### 2. 외부 자원 타임아웃 (스레드 고갈 방지)

S3 업로드, FastAPI 분석 요청 등 외부 네트워크를 타는 모든 로직은 **Connection/Read Timeout을 3~5초 이내**로 반드시 설정한다.  
타임아웃 미설정 시 외부 서비스 응답 지연이 Spring 서버 스레드를 점유하여 전체 서비스 응답 불능 상태로 이어질 수 있다.

### 3. IDOR 방지 (소유권 이중 검증)

모든 데이터 조회·수정 로직에서 `documentId` 단독 조회가 아닌, **`member_id`를 함께 조건(WHERE 절)으로 포함**하여 DB 쿼리를 작성한다.

```java
// Bad — documentId만으로 조회 후 서비스 레이어에서 비교
documentRepository.findById(documentId)

// Good — member_id를 쿼리 조건에 포함하여 DB 레벨에서 차단
documentRepository.findByDocumentIdAndMemberId(documentId, memberId)
```

서비스 레이어 비교만으로는 조회 쿼리 자체가 실행된다는 점에서 DB 부하와 정보 노출 가능성이 남는다.

### 4. WebSocket 연결 안전성 (구독 시점 소유권 검증)

JWT 인증 토큰이 유효하더라도 **아무 `documentId`나 구독할 수 있어서는 안 된다.**  
`ResumeStompChannelInterceptor`의 SUBSCRIBE 프레임 처리 시 구독 토픽의 `documentId`와 인증 유저의 `memberId`를 `DocumentRepository`로 DB 재조회하여 소유권을 검증한다.  
불일치 시 Close 1008로 즉시 연결을 거부한다.

### 5. Snapshot은 구독 세션에만 전송 (convertAndSendToUser)

SUBSCRIBE 직후 전송하는 현재 상태 Snapshot은 **해당 세션에만** 전달해야 한다.  
`SimpMessagingTemplate.convertAndSend()`는 토픽 구독자 전원에게 브로드캐스트하므로 사용 금지.  
반드시 `convertAndSendToUser(sessionId, destination, payload, headers)` + `SESSION_ID_HEADER`를 활용한다.

### 6. 세션 종료는 WebSocketSessionRegistry를 통해 수행

Grace Period 만료 후 서버가 세션을 닫을 때 `SESSION_CLOSE` 메시지를 payload로 전송하지 않는다.  
`WebSocketSessionRegistry.closeSession(documentId)` → `WebSocketSession.close(CloseStatus.NORMAL)` 으로 Close 1000을 전송한다.  
`WebSocketSession`은 `ResumeWebSocketHandlerDecoratorFactory`의 `afterConnectionEstablished`에서 Registry에 등록된다.
