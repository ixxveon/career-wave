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
| `file_url` | VARCHAR(500) | NOT NULL | S3 저장 파일 URL |
| `original_name` | VARCHAR(200) | NOT NULL | 업로드 원본 파일명 |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'UPLOADED' | `UPLOADED` \| `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 업로드 일시 |

> S3 저장 시 `original_name`을 그대로 파일명으로 사용하지 않는다.  
> 한글·특수문자 파일명 깨짐 방지를 위해 S3 키는 `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` 형식으로 생성.  
> `file_url`에는 완성된 S3 URL, `original_name`에는 사용자 원본 파일명을 별도 저장.

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
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |

> 점수 컬럼 5개는 분석 완료 전까지 `null`. FastAPI Webhook 수신 시 저장됨.  
> `feedback_text`는 항목별 첨삭 배열(`feedbackDetails`)을 JSON 직렬화한 문자열로 확정.  
> Spring에서 `ObjectMapper.readValue()`로 역직렬화하여 `ResponseFeedback.feedbackDetails`로 반환.

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
| UNIQUE | `(document_id, order_num)` | `CONSTRAINT uq_clc_document_order` | 동일 문서 내 순서 중복 방지 |

---

## 패키지 구조

```text
user/resume/
├── controller/
│   └── ResumeController.java
├── service/
│   └── ResumeService.java
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
├── type/
│   ├── FileType.java
│   └── DocumentStatus.java
└── docs/
    └── ResumeControllerDocs.java
```

> WebSocket 핸들러는 `global/websocket/` 또는 별도 패키지 분리 여부를 구현 시 팀 협의.

---

## DTO 구조

### ResumeDTO.java

```java
public class ResumeDTO {

    // 이력서 업로드 응답
    public record ResponseUpload(
        UUID documentId,
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
        String fileType,        // COVER_LETTER
        ZonedDateTime createdAt
    ) {}

    // 분석 결과 조회 응답
    // feedback_text(TEXT) → ObjectMapper 역직렬화 → feedbackDetails 배열로 반환
    public record ResponseFeedback(
        UUID documentId,
        String status,
        Integer scoreJobFitness,            // null: 분석 미완료
        Integer scoreTechStack,             // null: 분석 미완료
        Integer scoreQuantified,            // null: 분석 미완료
        Integer scoreLogical,               // null: 분석 미완료
        Integer scoreTotal,                 // null: 분석 미완료
        List<FeedbackDetail> feedbackDetails, // null: 분석 미완료, feedback_text JSON 파싱 결과
        ZonedDateTime createdAt
    ) {
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

POST /api/v1/user/resume/{documentId}/webhook        [FastAPI → Spring 내부 전용]
      → 분석 완료 콜백 수신 → DB 상태 업데이트 → WebSocket으로 프론트 알림

WS   /ws/resume/{documentId}/status?token={accessToken}
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
  - `Apache Tika` (`org.apache.tika`) 로 실제 파일 속성 검증 권장 (팀 합의 필요 시 명시)
  - `ContentInfo` 또는 `Tika.detect(InputStream)` 으로 `application/pdf` 등 실제 MIME 확인
- **검증 통과 후** UUID 기반 저장 파일명 생성 (`{UUID}.{확장자}`)
- S3 저장 경로: `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` — 날짜별 폴더로 파일 분산 관리
- S3 업로드 후 `file_url`, `original_name` 저장 (S3 Connection Timeout 3~5초 설정 필수)
- `Document` 저장 (`status = UPLOADED`)
- FastAPI 분석 트리거 비동기 호출 (`@Async` + `WebClient` 또는 별도 스레드)
  - 동기 호출 시 반드시 Connection/Read Timeout 3초 이내 설정 — 미설정 시 FastAPI 지연이 Spring 전체 지연으로 전파
  - 202 Accepted 기대, 호출 실패(타임아웃·5xx) 시 → `document.status = FAILED` 마킹 + 에러 로그 기록
- 반환: `ResumeDTO.ResponseUpload`

#### submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto)
- 문항 수 1~5개 외 → `INVALID_CONTENT_COUNT(400)`
- 답변 1000자 초과 → `INVALID_CONTENT_LENGTH(400)`
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
| `INVALID_CONTENT_COUNT` | 400 | 문항 수 범위(1~5) 위반 |
| `INVALID_CONTENT_LENGTH` | 400 | 답변 1000자 초과 |
| `DOCUMENT_NOT_FOUND` | 404 | 존재하지 않는 documentId |
| `DOCUMENT_ACCESS_DENIED` | 403 | 본인 소유가 아닌 문서 접근 (IDOR) |
| `FEEDBACK_PARSE_ERROR` | 500 | JSONB 역직렬화 실패 (FastAPI 응답 구조 변경 등) |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

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
