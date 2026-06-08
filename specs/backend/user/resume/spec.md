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
| `document_id` | UUID | NOT NULL, UNIQUE | 문서 FK (1:1) |
| `feedback_details` | JSONB | NOT NULL | AI 분석 결과 전체 (scores, overallReview, feedbackDetails 등) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |

> **컬럼명 확정**: 기존 DB의 `score`, `feedback_text` 컬럼 대신 `feedback_details` JSONB 단일 컬럼으로 통일.  
> FastAPI가 내려주는 복합 점수(`scores` 객체)·항목별 첨삭 배열(`feedbackDetails`)을 JSONB 그대로 저장하고,  
> Spring에서 `AttributeConverter`로 역직렬화하여 프론트 스펙(`api-schema.md § 3`) 응답 형식으로 반환.  
> ⚠️ DB 스키마 변경이 필요하므로 팀 공유 후 마이그레이션 스크립트 반영 필요.

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

    // 분석 결과 조회 응답 — feedback_details JSONB 역직렬화 결과를 그대로 반환
    public record ResponseFeedback(
        UUID documentId,
        String status,
        ScoreDetail scores,         // null: 분석 미완료
        String overallReview,       // null: 분석 미완료
        List<FeedbackDetail> feedbackDetails,   // null: 분석 미완료
        String errorMessage,        // FAILED 시 오류 메시지
        ZonedDateTime createdAt
    ) {}

    // 이력 목록 조회 응답 (단건)
    public record HistoryItem(
        UUID documentId,
        String fileType,
        String status,
        String originalName,    // 자기소개서: null (cover_letter_meta 참조)
        String company,         // 이력서: null (cover_letter_meta 참조)
        String job,             // 이력서: null (cover_letter_meta 참조)
        Integer totalScore,     // 분석 미완료: null (feedback_details.scores.total)
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
- 확장자 PDF·DOC·DOCX 외 (MIME type 기반 검증) → `INVALID_FILE_TYPE(400)`
- **검증 통과 후** UUID 기반 저장 파일명 생성 (`{UUID}.{확장자}`)
- S3 저장 경로: `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` — 날짜별 폴더로 파일 분산 관리
- S3 업로드 후 `file_url`, `stored_file_name`, `original_name` 저장
- `Document` 저장 (`status = UPLOADED`)
- FastAPI 분석 트리거 호출 → 202 Accepted 기대
- FastAPI 호출 실패(타임아웃·5xx) 시 → `document.status = FAILED` 마킹 + 에러 로그 기록
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
- `feedback_details` JSONB `AttributeConverter` 역직렬화 실패 시 → `FEEDBACK_PARSE_ERROR(500)` + 사용자 친화적 메시지 반환 (서버 전체 크래시 방지)
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

- S3 업로드 방식(Presigned URL vs 서버 직접 전송)은 구현 단계에서 팀 협의
- FastAPI 분석 트리거: Spring → FastAPI 분석 요청 후, FastAPI 완료 시 `POST .../webhook` 콜백 호출 (Webhook 방식 권장)
- WebSocket 구현은 `HandshakeInterceptor` 기반 인증 적용 — `@ServerEndpoint` vs STOMP는 구현 단계 결정
- `document_feedbacks` 데이터는 Webhook 콜백 수신 시 Spring이 DB에 저장 후 WebSocket 알림 발송
- `FAILED` 상태의 재시도 정책은 v1 범위 외 (실패 시 UI에서 재업로드 유도)
- members 테이블 PK는 UUID (`gen_random_uuid()`) — `document.member_id` FK 타입 동일하게 UUID 적용
