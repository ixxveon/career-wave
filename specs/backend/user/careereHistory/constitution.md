# Constitution: Career History API (User Career History)

---

## 1. DDL 우선 원칙

Career History 백엔드는 반드시 확정된 DDL을 기준으로 구현한다.

DDL에 존재하지 않는 테이블을 임의로 Entity로 생성하지 않는다.

사용 가능한 기준 테이블은 다음과 같다.

* career_histories
* interview_sessions
* ai_interview_feedbacks
* documents
* document_feedbacks

---

## 2. 조회 전용 원칙

Career History API는 조회 전용 기능으로 제한한다.

Career History 데이터 생성은 Interview 도메인 또는 FastAPI 콜백 처리 흐름에서 수행한다.

Career History API에서는 다음 기능을 제공하지 않는다.

* 생성
* 수정
* 삭제
* 별도 분석 데이터 생성

---

## 3. 소유권 검증 원칙

모든 Career History 조회는 member_id 기준으로 본인 데이터만 접근 가능해야 한다.

Controller에서 전달받은 인증 사용자 정보를 기준으로 memberId를 추출한다.

하드코딩된 사용자 ID를 사용하지 않는다.

예시:

* 금지: userId를 1L 같은 고정값으로 사용
* 허용: AuthPrincipal에서 추출한 사용자 ID 사용

---

## 4. 응답 래퍼 원칙

모든 Controller 응답은 프로젝트 공통 응답 형식인 ApiResponse<T>를 사용한다.

Raw DTO 또는 Raw List를 직접 반환하지 않는다.

예시:

* 금지: Service 결과를 그대로 반환
* 허용: ApiResponse로 감싸서 반환

---

## 5. 예외 처리 원칙

문자열 기반 RuntimeException 또는 IllegalArgumentException을 직접 사용하지 않는다.

프로젝트 공통 ErrorCode 기반 예외 처리 방식을 따른다.

예시:

* 금지: 문자열 메시지를 직접 포함한 예외 사용
* 허용: CareerHistoryErrorCode 기반 예외 사용

---

## 6. 패키지 구조 원칙

Career History 도메인은 user 하위 패키지에 구성한다.

권장 구조:

* controller
* service
* repository
* entity
* dto
* exception
* docs

---

## 7. DDL 외 구현 금지 대상

아래 클래스는 DDL에 대응되는 테이블이 없으므로 Career History 백엔드 구현에서 제외한다.

* CareerCompetencyReport
* CareerRoadmap
* InterviewPracticeHistory

해당 기능이 필요할 경우 먼저 DDL 또는 ERD 변경 협의가 필요하다.

---

## 8. 정렬 및 조회 정책

Career History 목록은 최신 기록이 먼저 노출되도록 created_at DESC 기준으로 정렬한다.

상세 조회는 다음 데이터를 조합하여 반환한다.

* Career History 기본 정보
* Interview Session 정보
* AI Interview Feedback 목록
* Document 정보
* Document Feedback 정보

---

## 9. 문서화 원칙

Controller에는 Swagger 어노테이션을 직접 과도하게 작성하지 않고 Docs 인터페이스를 분리한다.

예시:

* CareerHistoryControllerDocs

---

## 10. PR 전 검증 원칙

PR 생성 전 반드시 아래를 확인한다.

* DDL 기준 외 Entity 제거
* ApiResponse 적용
* AuthPrincipal 기반 memberId 사용
* ErrorCode 기반 예외 처리
* Swagger Docs 작성
* Gradle Build 성공
