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

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `document_id` | UUID PK | 문서 고유 식별자 |
| `member_id` | UUID FK NOT NULL | 소유 회원 (members 테이블 참조) |
| `file_type` | VARCHAR(20) | `RESUME` \| `COVER_LETTER` |
| `stored_file_name` | VARCHAR(255) NULL | S3 저장 파일명 (UUID 기반 생성, 자기소개서는 null) |
| `file_url` | TEXT NULL | S3 파일 URL (자기소개서는 null) |
| `original_name` | VARCHAR(255) NULL | 원본 파일명 — DB에만 보존, URL에 미노출 (자기소개서는 null) |
| `status` | VARCHAR(20) | `UPLOADED` \| `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `created_at` | TIMESTAMPTZ | 생성일시 |

> S3 저장 시 `original_name`을 그대로 사용하지 않는다.  
> 한글·특수문자 포함 파일명은 S3 경로에서 깨질 수 있으므로,  
> `stored_file_name`은 `{UUID}.{확장자}` 형식으로 별도 생성한다.

### cover_letter_contents

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `content_id` | BIGSERIAL PK | 문항 고유 식별자 |
| `document_id` | UUID FK | documents 참조 |
| `order_num` | SMALLINT | 문항 순서 (1~5) |
| `question` | TEXT | 문항 내용 |
| `answer` | TEXT | 답변 내용 (최대 1000자) |
| `created_at` | TIMESTAMPTZ | 생성일시 |

### document_feedbacks

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `feedback_id` | BIGSERIAL PK | 피드백 고유 식별자 |
| `document_id` | UUID FK UNIQUE | documents 참조 (1:1) |
| `score_job_fitness` | SMALLINT NULL | 직무 적합도 점수 (0~100) |
| `score_tech_stack` | SMALLINT NULL | 기술 스택 점수 (0~100) |
| `score_quantified` | SMALLINT NULL | 경험 수치화 점수 (0~100) |
| `score_logical` | SMALLINT NULL | 논리력 점수 (0~100) |
| `score_total` | SMALLINT NULL | 종합 점수 (0~100) |
| `overall_review` | TEXT NULL | AI 종합 총평 |
| `feedback_details` | JSONB NULL | 항목별 첨삭 가이드라인 배열 |
| `error_message` | TEXT NULL | 분석 실패 시 오류 메시지 |
| `created_at` | TIMESTAMPTZ | 생성일시 |

> `feedback_details` JSONB 구조는 `api-schema.md` § 3 참조.

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
│   ├── CoverLetterContent.java
│   └── DocumentFeedback.java
├── repository/
│   ├── DocumentRepository.java
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
    public record ResponseFeedback(
        UUID documentId,
        String status,
        ScoreDetail scores,     // null if not COMPLETED
        String overallReview,
        List<FeedbackDetail> feedbackDetails,
        String errorMessage,
        ZonedDateTime createdAt
    ) {
        public record ScoreDetail(
            int jobFitness,
            int techStack,
            int quantifiedAchievement,
            int logicalStructure,
            int total
        ) {}

        public record FeedbackDetail(
            int sectionNumber,
            String question,
            String originalText,
            String goodPoint,
            String badPoint,
            String improvedText,
            StarAnalysis starAnalysis,   // null 허용
            QuantAnalysis quantAnalysis  // null 허용
        ) {
            public record StarAnalysis(
                AnalysisItem s, AnalysisItem t,
                AnalysisItem a, AnalysisItem r
            ) {}

            public record QuantAnalysis(
                AnalysisItem numbers, AnalysisItem timeframe,
                AnalysisItem scale,   AnalysisItem impact
            ) {}

            public record AnalysisItem(boolean ok, String comment) {}
        }
    }

    // 이력 목록 조회 응답 (단건)
    public record HistoryItem(
        UUID documentId,
        String fileType,
        String originalName,    // 자기소개서: null
        String company,         // 이력서: null
        String job,             // 이력서: null
        Integer totalScore,     // 분석 미완료: null
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
- FastAPI 분석 비동기 트리거 (내부 HTTP — Webhook 방식 적용)
- 반환: `ResumeDTO.ResponseUpload`

#### submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto)
- 문항 수 1~5개 외 → `INVALID_CONTENT_COUNT(400)`
- 답변 1000자 초과 → `INVALID_CONTENT_LENGTH(400)`
- `Document` 저장 (`status = UPLOADED`, `file_url = null`)
- `CoverLetterContent` 벌크 저장
- FastAPI 분석 비동기 트리거
- 반환: `ResumeDTO.ResponseCoverLetter`

#### getFeedback(UUID memberId, UUID documentId)
- Document 존재하지 않음 → `DOCUMENT_NOT_FOUND(404)`
- 소유자 불일치 → `DOCUMENT_ACCESS_DENIED(403)`
- `DocumentFeedback` 조회 (없으면 status만 반환)
- `feedback_details` JSONB 역직렬화 실패 시 → `FEEDBACK_PARSE_ERROR(500)` + 사용자 친화적 메시지 반환 (서버 전체 크래시 방지)
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
