# Plan: Career History API (User Career History)

---

## 목표

DDL 기준으로 Career History 조회 API를 구현한다.

Career History는 사용자의 AI 면접 결과를 누적 조회하는 기능이며, 별도 분석 데이터를 새로 생성하지 않는다.
기준 데이터는 `career_histories`, `interview_sessions`, `ai_interview_feedbacks`, `documents`, `document_feedbacks` 테이블이다.

---

## Phase 1 — Entity 정의

DDL 기준으로 조회에 필요한 Entity를 정의하거나 기존 도메인 Entity를 재사용한다.

* CareerHistory
* InterviewSession
* AIInterviewFeedback
* Document
* DocumentFeedback

DDL에 없는 별도 Entity는 생성하지 않는다.

제외 대상:

* CareerCompetencyReport
* CareerRoadmap
* InterviewPracticeHistory

---

## Phase 2 — DTO 정의

Career History API 응답 전용 DTO를 정의한다.

* 목록 조회 DTO
* 상세 조회 DTO
* 면접 세션 요약 DTO
* 질문별 AI 피드백 DTO
* 연결 문서 요약 DTO
* 문서 피드백 요약 DTO
* PDF URL 응답 DTO

---

## Phase 3 — Repository 구현

DDL 기준 테이블 조회를 위한 Repository를 구성한다.

* CareerHistoryRepository
* InterviewSessionRepository
* AIInterviewFeedbackRepository
* DocumentRepository
* DocumentFeedbackRepository

이미 다른 도메인에 Repository가 존재하는 경우 중복 생성하지 않고 재사용 여부를 확인한다.

---

## Phase 4 — Service 구현

CareerHistoryService에서 조회 로직을 구현한다.

* 본인 Career History 목록 조회
* Career History 상세 조회
* PDF 리포트 URL 조회

모든 조회는 `member_id` 기준 소유권 검증을 포함한다.

---

## Phase 5 — Controller & Swagger Docs

사용자 Career History API Controller와 Swagger Docs를 구현한다.

* `GET /api/v1/user/career-histories`
* `GET /api/v1/user/career-histories/{careerHistoryId}`
* `GET /api/v1/user/career-histories/{careerHistoryId}/report`

모든 응답은 `ApiResponse<T>` 래퍼를 사용한다.

---

## Phase 6 — Security & ErrorCode

Career History API 접근 권한과 예외 코드를 정의한다.

* JWT 인증 필수
* USER 권한 필수
* 존재하지 않는 기록 예외
* 타인 기록 접근 예외
* PDF URL 없음 예외

---

## Phase 7 — 검증

Swagger UI와 빌드를 통해 API 계약과 DDL 매핑을 검증한다.

* DDL 컬럼과 Entity 매핑 일치 확인
* 본인 데이터만 조회되는지 확인
* 상세 조회 조합 데이터 확인
* PDF URL 조회 확인
* FE api-schema와 응답 필드 일치 확인

---

## Phase 8 — PR 전 최종 점검

DDL에 없는 임의 Entity, Repository, DTO가 포함되지 않았는지 확인한다.

* CareerCompetencyReport 제거
* CareerRoadmap 제거
* InterviewPracticeHistory 제거
* ApiResponse 적용
* AuthPrincipal 기반 memberId 적용
* ErrorCode 기반 예외 처리 적용
* Build 성공 후 PR 생성
