# Spec: Career History API (User Career History)

**Feature Branch**: `feature/user-career-history-be`
**버전**: v1
**Status**: 스펙 작성
**관련 FE 스펙**: `specs/frontend/user/careerHistory/spec.md`

---

## 도메인 개요

Career History는 회원이 수행한 AI 면접 결과를 누적 보관하고, 과거 면접 기록과 AI 피드백을 조회하는 기능이다.

Career History는 별도 분석 데이터를 새로 생성하지 않고, DDL에 정의된 기존 테이블을 기반으로 조회 전용 API를 제공한다.

사용자는 본인의 면접 이력 목록, 상세 기록, 질문별 AI 피드백, 연결 서류 정보, 종합 진단 PDF URL을 확인할 수 있다.

* 모든 API는 JWT 인증 + USER 권한 필수
* 모든 기록은 `member_id` 기준 소유권 검증 필수
* 타인 기록 접근 시 403 반환
* 존재하지 않는 기록 접근 시 404 반환
* Career History는 조회 전용 기능만 제공
* 데이터 기준 테이블은 `career_histories`, `interview_sessions`, `ai_interview_feedbacks`, `documents`, `document_feedbacks`

---

## ERD

### career_histories

| 컬럼                  | 타입           | 제약                     | 설명            |
| ------------------- | ------------ | ---------------------- | ------------- |
| `career_history_id` | BIGSERIAL    | PK                     | 기록 고유 식별자     |
| `member_id`         | UUID         | NOT NULL               | 회원 FK         |
| `session_id`        | UUID         | NOT NULL               | 면접 세션 FK      |
| `document_id`       | UUID         | NULL                   | 연결 서류 FK      |
| `total_score`       | INTEGER      | NULL                   | 최종 종합 점수      |
| `feedback`          | TEXT         | NULL                   | AI 종합 피드백     |
| `pdf_url`           | VARCHAR(500) | NULL                   | 종합 진단 PDF URL |
| `created_at`        | TIMESTAMPTZ  | NOT NULL DEFAULT now() | 기록 생성 일시      |

### interview_sessions

| 컬럼               | 타입           | 제약       | 설명                                |
| ---------------- | ------------ | -------- | --------------------------------- |
| `session_id`     | UUID         | PK       | 면접 세션 고유 식별자                      |
| `member_id`      | UUID         | NOT NULL | 회원 FK                             |
| `document_id`    | UUID         | NULL     | 연결 서류 FK                          |
| `session_type`   | VARCHAR(10)  | NOT NULL | TEXT / VOICE / VIDEO              |
| `session_status` | VARCHAR(20)  | NOT NULL | IN_PROGRESS / COMPLETED / FAILED  |
| `interview_type` | VARCHAR(20)  | NULL     | TECHNICAL / PERSONALITY / PROJECT |
| `target_company` | VARCHAR(100) | NULL     | 준비 대상 기업명                         |
| `total_score`    | INTEGER      | NULL     | 면접 종합 점수                          |
| `started_at`     | TIMESTAMPTZ  | NULL     | 면접 시작 일시                          |
| `ended_at`       | TIMESTAMPTZ  | NULL     | 면접 종료 일시                          |
| `created_at`     | TIMESTAMPTZ  | NOT NULL | 세션 생성 일시                          |
| `updated_at`     | TIMESTAMPTZ  | NOT NULL | 세션 수정 일시                          |

### ai_interview_feedbacks

| 컬럼                      | 타입           | 제약       | 설명          |
| ----------------------- | ------------ | -------- | ----------- |
| `interview_feedback_id` | BIGSERIAL    | PK       | 피드백 고유 식별자  |
| `session_id`            | UUID         | NOT NULL | 면접 세션 FK    |
| `question_order`        | INTEGER      | NOT NULL | 질문 순서       |
| `question_text`         | TEXT         | NOT NULL | 질문 내용       |
| `answer_text`           | TEXT         | NOT NULL | 사용자 답변      |
| `relevance_score`       | INTEGER      | NULL     | 직무 연관성 점수   |
| `depth_score`           | INTEGER      | NULL     | 답변 깊이 점수    |
| `delivery_score`        | INTEGER      | NULL     | 전달력 점수      |
| `fluency_score`         | INTEGER      | NULL     | 유창성 점수      |
| `voice_quality_ratio`   | DECIMAL(5,2) | NULL     | 음성 인식 유효 비율 |
| `ai_feedback`           | TEXT         | NULL     | 질문별 AI 피드백  |
| `created_at`            | TIMESTAMPTZ  | NOT NULL | 피드백 생성 일시   |

### documents

| 컬럼              | 타입           | 제약       | 설명                    |
| --------------- | ------------ | -------- | --------------------- |
| `document_id`   | UUID         | PK       | 문서 고유 식별자             |
| `member_id`     | UUID         | NOT NULL | 회원 FK                 |
| `file_type`     | VARCHAR(20)  | NOT NULL | RESUME / COVER_LETTER |
| `file_url`      | VARCHAR(500) | NULL     | S3 파일 URL             |
| `original_name` | VARCHAR(200) | NULL     | 원본 파일명                |
| `status`        | VARCHAR(20)  | NOT NULL | 문서 처리 상태              |
| `error_message` | TEXT         | NULL     | 오류 메시지                |
| `created_at`    | TIMESTAMPTZ  | NOT NULL | 업로드 일시                |

### document_feedbacks

| 컬럼                     | 타입          | 제약       | 설명            |
| ---------------------- | ----------- | -------- | ------------- |
| `document_feedback_id` | BIGSERIAL   | PK       | 서류 피드백 고유 식별자 |
| `document_id`          | UUID        | NOT NULL | 문서 FK         |
| `score_job_fitness`    | INTEGER     | NULL     | 직무 적합도 점수     |
| `score_tech_stack`     | INTEGER     | NULL     | 기술 스택 점수      |
| `score_quantified`     | INTEGER     | NULL     | 경험 수치화 점수     |
| `score_logical`        | INTEGER     | NULL     | 논리력 점수        |
| `score_total`          | INTEGER     | NULL     | 서류 종합 점수      |
| `overall_review`       | TEXT        | NULL     | AI 종합 총평      |
| `feedback_text`        | TEXT        | NOT NULL | AI 상세 첨삭 결과   |
| `created_at`           | TIMESTAMPTZ | NOT NULL | 생성 일시         |

---

## 패키지 구조

```text
user/careerhistory/
├── controller/
│   └── CareerHistoryController.java
├── service/
│   ├── CareerHistoryService.java
│   └── CareerHistoryQueryService.java
├── repository/
│   ├── CareerHistoryRepository.java
│   ├── InterviewSessionRepository.java
│   ├── AIInterviewFeedbackRepository.java
│   ├── DocumentRepository.java
│   └── DocumentFeedbackRepository.java
├── entity/
│   ├── CareerHistory.java
│   ├── InterviewSession.java
│   ├── AIInterviewFeedback.java
│   ├── Document.java
│   └── DocumentFeedback.java
├── dto/
│   └── CareerHistoryDTO.java
├── exception/
│   └── CareerHistoryErrorCode.java
└── docs/
    └── CareerHistoryControllerDocs.java
```

---

## DTO 구조

```java
public class CareerHistoryDTO {

    public record HistoryItem(
        Long careerHistoryId,
        String sessionId,
        String sessionType,
        String interviewType,
        String targetCompany,
        String sessionStatus,
        Integer totalScore,
        String pdfUrl,
        ZonedDateTime createdAt
    ) {}

    public record ResponseHistoryDetail(
        Long careerHistoryId,
        String sessionId,
        String documentId,
        Integer totalScore,
        String feedback,
        String pdfUrl,
        ZonedDateTime createdAt,
        SessionSummary session,
        DocumentSummary document,
        DocumentFeedbackSummary documentFeedback,
        List<InterviewFeedbackItem> interviewFeedbacks
    ) {}

    public record SessionSummary(
        String sessionType,
        String sessionStatus,
        String interviewType,
        String targetCompany,
        Integer totalScore,
        ZonedDateTime startedAt,
        ZonedDateTime endedAt
    ) {}

    public record InterviewFeedbackItem(
        Long interviewFeedbackId,
        Integer questionOrder,
        String questionText,
        String answerText,
        Integer relevanceScore,
        Integer depthScore,
        Integer deliveryScore,
        Integer fluencyScore,
        BigDecimal voiceQualityRatio,
        String aiFeedback,
        ZonedDateTime createdAt
    ) {}

    public record DocumentSummary(
        String documentId,
        String fileType,
        String originalName,
        String status,
        ZonedDateTime createdAt
    ) {}

    public record DocumentFeedbackSummary(
        Long documentFeedbackId,
        Integer scoreJobFitness,
        Integer scoreTechStack,
        Integer scoreQuantified,
        Integer scoreLogical,
        Integer scoreTotal,
        String overallReview,
        String feedbackText,
        ZonedDateTime createdAt
    ) {}

    public record ResponseReportUrl(
        Long careerHistoryId,
        String pdfUrl
    ) {}
}
```

---

## API 명세

### 취업 준비 기록 목록 조회

```http
GET /api/v1/user/career-histories?page=0&size=10
→ ApiResponse<PaginationResponse<CareerHistoryDTO.HistoryItem>>
```

* 본인 기록만 조회
* `career_histories.created_at DESC` 최신순 정렬
* `interview_sessions`를 함께 조회하여 세션 유형, 면접 유형, 대상 기업, 세션 상태를 반환

---

### 취업 준비 기록 상세 조회

```http
GET /api/v1/user/career-histories/{careerHistoryId}
→ ApiResponse<CareerHistoryDTO.ResponseHistoryDetail>
```

* `career_history_id` 기준 단건 조회
* `member_id` 소유권 검증
* 연결된 면접 세션 정보 조회
* 질문별 AI 면접 피드백 조회
* 연결된 문서 정보 조회
* 문서 피드백 정보 조회
* PDF URL 반환

---

### PDF 리포트 URL 조회

```http
GET /api/v1/user/career-histories/{careerHistoryId}/report
→ ApiResponse<CareerHistoryDTO.ResponseReportUrl>
```

* `career_history_id` 기준 단건 조회
* `member_id` 소유권 검증
* `pdf_url` 존재 여부 확인
* PDF URL 반환

---

## 서비스 로직

### getHistories(UUID memberId, int page, int size)

* `member_id` 기준으로 본인 기록만 조회
* `career_histories.created_at DESC` 정렬
* `interview_sessions`와 조합하여 목록 응답 생성
* 반환: `PaginationResponse<HistoryItem>`

### getHistoryDetail(UUID memberId, Long careerHistoryId)

* `career_history_id`와 `member_id` 기준으로 이력 조회
* 기록이 없으면 `CAREER_HISTORY_NOT_FOUND`
* 세션 정보 조회
* 질문별 AI 피드백 조회
* 문서 정보 조회
* 문서 피드백 조회
* 반환: `ResponseHistoryDetail`

### getReportUrl(UUID memberId, Long careerHistoryId)

* `career_history_id`와 `member_id` 기준으로 이력 조회
* 기록이 없으면 `CAREER_HISTORY_NOT_FOUND`
* `pdf_url`이 없으면 `CAREER_HISTORY_REPORT_NOT_FOUND`
* 반환: `ResponseReportUrl`

---

## ErrorCode

| ErrorCode                          | HTTP | 발생 시점            |
| ---------------------------------- | ---- | ---------------- |
| `CAREER_HISTORY_NOT_FOUND`         | 404  | 존재하지 않는 기록       |
| `CAREER_HISTORY_ACCESS_DENIED`     | 403  | 본인 소유가 아닌 기록 접근  |
| `CAREER_HISTORY_REPORT_NOT_FOUND`  | 404  | PDF URL이 없는 기록   |
| `CAREER_HISTORY_SESSION_NOT_FOUND` | 404  | 연결된 면접 세션이 없는 경우 |
| `UNAUTHORIZED`                     | 401  | 토큰 없음 또는 만료      |

---

## Assumptions

* Career History 데이터 생성은 Interview 도메인 또는 FastAPI 콜백 처리 흐름에서 수행한다.
* Career History API는 조회 전용이다.
* `career_histories.session_id`는 `interview_sessions.session_id`와 연결된다.
* `career_histories.document_id`는 `documents.document_id`와 연결된다.
* `ai_interview_feedbacks`는 `session_id` 기준으로 조회한다.
* `document_feedbacks`는 `document_id` 기준으로 조회한다.
* DDL에 없는 `CareerCompetencyReport`, `CareerRoadmap`, `InterviewPracticeHistory`는 구현하지 않는다.
