# Checklist: Career History API (User Career History)

---

## DDL 기준 확인

* [ ] `career_histories` 테이블 기준으로 Entity를 작성했는가?
* [ ] `interview_sessions` 테이블을 조회 기준으로 사용했는가?
* [ ] `ai_interview_feedbacks` 테이블을 조회 기준으로 사용했는가?
* [ ] `documents` 테이블을 조회 기준으로 사용했는가?
* [ ] `document_feedbacks` 테이블을 조회 기준으로 사용했는가?
* [ ] DDL에 없는 Entity를 생성하지 않았는가?

---

## 제거 대상 확인

* [ ] `CareerCompetencyReport` Entity를 제거했는가?
* [ ] `CareerRoadmap` Entity를 제거했는가?
* [ ] `InterviewPracticeHistory` Entity를 제거했는가?
* [ ] `CareerCompetencyReportRepository`를 제거했는가?
* [ ] `CareerRoadmapRepository`를 제거했는가?
* [ ] `InterviewPracticeHistoryRepository`를 제거했는가?

---

## API 응답 구조 확인

* [ ] 모든 응답이 `ApiResponse<T>`로 감싸져 있는가?
* [ ] 목록 조회 응답이 FE api-schema와 일치하는가?
* [ ] 상세 조회 응답이 FE api-schema와 일치하는가?
* [ ] PDF URL 조회 응답이 FE api-schema와 일치하는가?
* [ ] 날짜 타입 응답 형식이 프로젝트 기준과 일치하는가?

---

## 인증/인가 확인

* [ ] 모든 API에 JWT 인증이 적용되어 있는가?
* [ ] 모든 API에 USER 권한이 필요한가?
* [ ] Controller에서 `@AuthenticationPrincipal AuthPrincipal`을 사용하는가?
* [ ] 하드코딩된 `memberId = 1L`이 제거되었는가?
* [ ] 타인 기록 접근이 차단되는가?

---

## Service 로직 확인

* [ ] 목록 조회가 `member_id` 기준으로 필터링되는가?
* [ ] 목록 조회가 `created_at DESC` 최신순으로 정렬되는가?
* [ ] 상세 조회가 `career_history_id`와 `member_id` 기준으로 조회되는가?
* [ ] 상세 조회에서 면접 세션 정보가 포함되는가?
* [ ] 상세 조회에서 질문별 AI 피드백이 포함되는가?
* [ ] 상세 조회에서 연결 문서 정보가 포함되는가?
* [ ] 상세 조회에서 문서 피드백 정보가 포함되는가?
* [ ] PDF URL이 없을 때 예외 처리되는가?

---

## ErrorCode 확인

* [ ] `CAREER_HISTORY_NOT_FOUND`를 정의했는가?
* [ ] `CAREER_HISTORY_ACCESS_DENIED`를 정의했는가?
* [ ] `CAREER_HISTORY_REPORT_NOT_FOUND`를 정의했는가?
* [ ] 프로젝트 공통 예외 처리 방식과 일치하는가?
* [ ] 문자열 하드코딩 예외를 사용하지 않는가?

---

## Swagger Docs 확인

* [ ] `CareerHistoryControllerDocs.java`를 작성했는가?
* [ ] 목록 조회 API가 문서화되었는가?
* [ ] 상세 조회 API가 문서화되었는가?
* [ ] PDF URL 조회 API가 문서화되었는가?
* [ ] Swagger UI에서 정상 노출되는가?

---

## PR 전 확인

* [ ] `./gradlew build`가 성공하는가?
* [ ] 불필요한 import가 제거되었는가?
* [ ] 사용하지 않는 클래스가 제거되었는가?
* [ ] CodeRabbit 주요 리뷰를 반영했는가?
* [ ] PR 설명에 변경 내용을 정리했는가?
