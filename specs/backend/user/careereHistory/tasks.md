# Tasks: Career History API (User Career History)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Entity 정의

* [ ] `CareerHistory.java` Entity

    * [ ] `career_history_id` BIGSERIAL PK
    * [ ] `member_id` UUID NOT NULL
    * [ ] `session_id` UUID NOT NULL
    * [ ] `document_id` UUID nullable
    * [ ] `total_score` INTEGER nullable
    * [ ] `feedback` TEXT nullable
    * [ ] `pdf_url` VARCHAR(500) nullable
    * [ ] `created_at` TIMESTAMPTZ NOT NULL
    * [ ] `@Table(name = "career_histories")` 적용
    * [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

* [ ] `InterviewSession.java` 조회용 Entity 확인

    * [ ] `interview_sessions` DDL과 매핑 일치 확인
    * [ ] `session_id` UUID PK
    * [ ] `member_id` UUID NOT NULL
    * [ ] `document_id` UUID nullable
    * [ ] `session_type` VARCHAR(10)
    * [ ] `session_status` VARCHAR(20)
    * [ ] `interview_type` VARCHAR(20) nullable
    * [ ] `target_company` VARCHAR(100) nullable
    * [ ] `total_score` INTEGER nullable
    * [ ] `started_at` / `ended_at` / `created_at` / `updated_at`

* [ ] `AIInterviewFeedback.java` 조회용 Entity 확인

    * [ ] `ai_interview_feedbacks` DDL과 매핑 일치 확인
    * [ ] `interview_feedback_id` BIGSERIAL PK
    * [ ] `session_id` UUID NOT NULL
    * [ ] `question_order` INTEGER NOT NULL
    * [ ] `question_text` TEXT NOT NULL
    * [ ] `answer_text` TEXT NOT NULL
    * [ ] `relevance_score` INTEGER nullable
    * [ ] `depth_score` INTEGER nullable
    * [ ] `delivery_score` INTEGER nullable
    * [ ] `fluency_score` INTEGER nullable
    * [ ] `voice_quality_ratio` DECIMAL(5,2) nullable
    * [ ] `ai_feedback` TEXT nullable
    * [ ] `created_at` TIMESTAMPTZ NOT NULL

* [ ] `Document.java` 조회용 Entity 확인

    * [ ] `documents` DDL과 매핑 일치 확인
    * [ ] `document_id` UUID PK
    * [ ] `member_id` UUID NOT NULL
    * [ ] `file_type` VARCHAR(20)
    * [ ] `file_url` VARCHAR(500)
    * [ ] `original_name` VARCHAR(200)
    * [ ] `status` VARCHAR(20)
    * [ ] `error_message` TEXT
    * [ ] `created_at` TIMESTAMPTZ

* [ ] `DocumentFeedback.java` 조회용 Entity 확인

    * [ ] `document_feedbacks` DDL과 매핑 일치 확인
    * [ ] `document_feedback_id` BIGSERIAL PK
    * [ ] `document_id` UUID NOT NULL
    * [ ] `score_job_fitness` INTEGER nullable
    * [ ] `score_tech_stack` INTEGER nullable
    * [ ] `score_quantified` INTEGER nullable
    * [ ] `score_logical` INTEGER nullable
    * [ ] `score_total` INTEGER nullable
    * [ ] `overall_review` TEXT nullable
    * [ ] `feedback_text` TEXT NOT NULL
    * [ ] `created_at` TIMESTAMPTZ NOT NULL

---

## Phase 2 — DTO 정의

* [ ] `CareerHistoryDTO.java`

    * [ ] `HistoryItem`

        * [ ] careerHistoryId
        * [ ] sessionId
        * [ ] sessionType
        * [ ] interviewType
        * [ ] targetCompany
        * [ ] sessionStatus
        * [ ] totalScore
        * [ ] pdfUrl
        * [ ] createdAt

    * [ ] `ResponseHistoryDetail`

        * [ ] careerHistoryId
        * [ ] sessionId
        * [ ] documentId
        * [ ] totalScore
        * [ ] feedback
        * [ ] pdfUrl
        * [ ] createdAt
        * [ ] session
        * [ ] document
        * [ ] documentFeedback
        * [ ] interviewFeedbacks

    * [ ] `SessionSummary`

        * [ ] sessionType
        * [ ] sessionStatus
        * [ ] interviewType
        * [ ] targetCompany
        * [ ] totalScore
        * [ ] startedAt
        * [ ] endedAt

    * [ ] `InterviewFeedbackItem`

        * [ ] interviewFeedbackId
        * [ ] questionOrder
        * [ ] questionText
        * [ ] answerText
        * [ ] relevanceScore
        * [ ] depthScore
        * [ ] deliveryScore
        * [ ] fluencyScore
        * [ ] voiceQualityRatio
        * [ ] aiFeedback
        * [ ] createdAt

    * [ ] `DocumentSummary`

        * [ ] documentId
        * [ ] fileType
        * [ ] originalName
        * [ ] status
        * [ ] createdAt

    * [ ] `DocumentFeedbackSummary`

        * [ ] documentFeedbackId
        * [ ] scoreJobFitness
        * [ ] scoreTechStack
        * [ ] scoreQuantified
        * [ ] scoreLogical
        * [ ] scoreTotal
        * [ ] overallReview
        * [ ] feedbackText
        * [ ] createdAt

    * [ ] `ResponseReportUrl`

        * [ ] careerHistoryId
        * [ ] pdfUrl

---

## Phase 3 — Repository 구현

* [ ] `CareerHistoryRepository.java`

    * [ ] `findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable)`
    * [ ] `findByCareerHistoryIdAndMemberId(Long careerHistoryId, UUID memberId)`

* [ ] `InterviewSessionRepository.java`

    * [ ] `findBySessionId(UUID sessionId)`
    * [ ] 조회용으로 기존 Interview 도메인 Repository 재사용 가능 여부 확인

* [ ] `AIInterviewFeedbackRepository.java`

    * [ ] `findBySessionIdOrderByQuestionOrderAsc(UUID sessionId)`
    * [ ] 조회용으로 기존 Interview 도메인 Repository 재사용 가능 여부 확인

* [ ] `DocumentRepository.java`

    * [ ] `findByDocumentIdAndMemberId(UUID documentId, UUID memberId)`
    * [ ] 기존 Document 도메인 Repository 재사용 가능 여부 확인

* [ ] `DocumentFeedbackRepository.java`

    * [ ] `findByDocumentId(UUID documentId)`
    * [ ] 기존 Document 도메인 Repository 재사용 가능 여부 확인

---

## Phase 4 — Service 구현

### CareerHistoryService

* [ ] `getHistories(UUID memberId, int page, int size)`

    * [ ] `career_histories.member_id = memberId` 조건으로 조회
    * [ ] `created_at DESC` 최신순 정렬
    * [ ] `interview_sessions` 정보를 함께 조회
    * [ ] DTO `HistoryItem`으로 변환
    * [ ] `PaginationResponse<HistoryItem>` 반환

* [ ] `getHistoryDetail(UUID memberId, Long careerHistoryId)`

    * [ ] `career_history_id` + `member_id` 기준으로 기록 조회
    * [ ] 존재하지 않는 기록이면 `CAREER_HISTORY_NOT_FOUND`
    * [ ] `session_id` 기준으로 `interview_sessions` 조회
    * [ ] `session_id` 기준으로 `ai_interview_feedbacks` 조회
    * [ ] `document_id`가 있으면 `documents` 조회
    * [ ] `document_id`가 있으면 `document_feedbacks` 조회
    * [ ] 상세 응답 DTO로 조합
    * [ ] `ResponseHistoryDetail` 반환

* [ ] `getReportUrl(UUID memberId, Long careerHistoryId)`

    * [ ] `career_history_id` + `member_id` 기준으로 기록 조회
    * [ ] 존재하지 않는 기록이면 `CAREER_HISTORY_NOT_FOUND`
    * [ ] `pdf_url`이 null 또는 blank이면 `CAREER_HISTORY_REPORT_NOT_FOUND`
    * [ ] `ResponseReportUrl` 반환

---

## Phase 5 — Controller & Swagger Docs

* [ ] `CareerHistoryController.java`

    * [ ] `GET /api/v1/user/career-histories`

        * [ ] `page`, `size` request parameter 적용
        * [ ] `@AuthenticationPrincipal AuthPrincipal principal` 적용
        * [ ] `ApiResponse<PaginationResponse<HistoryItem>>` 반환

    * [ ] `GET /api/v1/user/career-histories/{careerHistoryId}`

        * [ ] `@PathVariable Long careerHistoryId`
        * [ ] `@AuthenticationPrincipal AuthPrincipal principal` 적용
        * [ ] `ApiResponse<ResponseHistoryDetail>` 반환

    * [ ] `GET /api/v1/user/career-histories/{careerHistoryId}/report`

        * [ ] `@PathVariable Long careerHistoryId`
        * [ ] `@AuthenticationPrincipal AuthPrincipal principal` 적용
        * [ ] `ApiResponse<ResponseReportUrl>` 반환

    * [ ] Controller에서 하드코딩 `memberId = 1L` 제거

    * [ ] Controller에서 try-catch 사용 금지

* [ ] `CareerHistoryControllerDocs.java`

    * [ ] `@Tag(name = "User Career History")`
    * [ ] 목록 조회 API 문서화
    * [ ] 상세 조회 API 문서화
    * [ ] PDF URL 조회 API 문서화

---

## Phase 6 — Security & ErrorCode

* [ ] Security 설정

    * [ ] `GET /api/v1/user/career-histories/**` → USER 권한 필요
    * [ ] JWT 인증 필수

* [ ] `CareerHistoryErrorCode.java`

    * [ ] `CAREER_HISTORY_NOT_FOUND` (404)
    * [ ] `CAREER_HISTORY_ACCESS_DENIED` (403)
    * [ ] `CAREER_HISTORY_REPORT_NOT_FOUND` (404)
    * [ ] `CAREER_HISTORY_SESSION_NOT_FOUND` (404)
    * [ ] 중복 ErrorCode 존재 여부 확인
    * [ ] 프로젝트 공통 예외 처리 규칙에 맞게 적용

---

## Phase 7 — 검증

* [ ] checklist.md 전 항목 셀프 체크
* [ ] Swagger UI에서 API 요청/응답 확인
* [ ] DDL 컬럼과 Entity 매핑 일치 확인
* [ ] 목록 조회가 본인 기록만 반환하는지 확인
* [ ] 목록 조회가 `created_at DESC` 최신순으로 반환되는지 확인
* [ ] 상세 조회에서 세션 정보가 정상 반환되는지 확인
* [ ] 상세 조회에서 질문별 AI 피드백이 `question_order ASC`로 반환되는지 확인
* [ ] 연결 문서가 없는 기록도 조회 가능한지 확인
* [ ] 문서 피드백이 없는 경우 null 처리되는지 확인
* [ ] PDF URL이 없는 경우 404 반환 확인
* [ ] 존재하지 않는 careerHistoryId 조회 시 404 반환 확인
* [ ] 타인 careerHistoryId 조회 시 403 또는 404 정책에 맞게 반환 확인
* [ ] JWT 없는 경우 401 반환 확인
* [ ] FE api-schema와 실제 응답 필드명·타입 일치 확인

---

## Phase 8 — PR 전 최종 점검

* [ ] DDL에 없는 Entity 제거 확인

    * [ ] `CareerCompetencyReport` 제거
    * [ ] `CareerRoadmap` 제거
    * [ ] `InterviewPracticeHistory` 제거

* [ ] DDL에 없는 Repository 제거 확인

    * [ ] `CareerCompetencyReportRepository` 제거
    * [ ] `CareerRoadmapRepository` 제거
    * [ ] `InterviewPracticeHistoryRepository` 제거

* [ ] DDL 기준 테이블명 일치 확인

    * [ ] `career_histories`
    * [ ] `interview_sessions`
    * [ ] `ai_interview_feedbacks`
    * [ ] `documents`
    * [ ] `document_feedbacks`

* [ ] ApiResponse 래퍼 적용 확인

* [ ] AuthPrincipal 기반 memberId 사용 확인

* [ ] ErrorCode 기반 예외 처리 확인

* [ ] Swagger Docs 분리 확인

* [ ] 빌드 성공 확인

* [ ] PR 생성 및 Self Review 완료
