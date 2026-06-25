# Constitution: Community API (User Community)

---

## 1. DDL 우선 원칙

Community 백엔드는 반드시 확정된 DDL을 기준으로 구현한다.

DDL에 존재하지 않는 테이블을 임의로 Entity로 생성하지 않는다.

사용 가능한 기준 테이블은 다음과 같다.

* boards
* comments
* reports

---

## 2. 책임 범위 원칙

Community 사용자 API는 게시글, 댓글, 신고 생성 기능을 담당한다.

관리자 처리 영역은 사용자 API에서 수행하지 않는다.

사용자 API에서 수행하지 않는 기능:

* 신고 처리 상태 변경
* 게시글 블라인드 처리
* 댓글 블라인드 처리
* 관리자 판단 결과 저장
* AI 신고 판단 결과 확정

---

## 3. 소유권 검증 원칙

게시글과 댓글의 수정·삭제는 작성자 본인만 가능하다.

작성자 검증은 member_id 기준으로 수행한다.

Controller에서 인증 사용자 정보를 기반으로 memberId를 추출한다.

하드코딩된 사용자 ID를 사용하지 않는다.

예시:

* 금지: memberId를 1L 같은 고정값으로 사용
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
* 허용: CommunityErrorCode 기반 예외 사용

---

## 6. 블라인드 처리 원칙

블라인드 처리는 관리자 도메인에서 수행한다.

사용자 API는 is_blind 상태를 기준으로 응답을 제한한다.

블라인드 상태의 게시글 또는 댓글에 대해 일반 사용자가 전체 내용을 볼 수 있는지 여부는 프로젝트 정책을 따른다.

---

## 7. 신고 처리 원칙

사용자는 신고 생성까지만 수행할 수 있다.

신고 상태 변경은 관리자 도메인에서 수행한다.

신고 생성 시 다음 값을 저장한다.

* 신고당한 회원: member_id
* 신고한 회원: reporter_id
* 신고 대상 유형: target_type
* 신고 대상 ID: target_id
* 신고 사유: reason
* 신고 상태: PENDING

---

## 8. 중복 신고 방지 원칙

동일 사용자가 동일 대상에 대해 중복 신고하지 못하도록 방지한다.

중복 기준:

* reporter_id
* target_type
* target_id

중복 신고 시 COMMUNITY_DUPLICATE_REPORT를 반환한다.

---

## 9. 패키지 구조 원칙

Community 도메인은 user 하위 패키지에 구성한다.

권장 구조:

* controller
* service
* repository
* entity
* dto
* type
* exception
* docs

---

## 10. 문서화 원칙

Controller에는 Swagger 어노테이션을 직접 과도하게 작성하지 않고 Docs 인터페이스를 분리한다.

예시:

* CommunityBoardControllerDocs
* CommunityCommentControllerDocs
* CommunityReportControllerDocs

---

## 11. 정렬 및 조회 정책

게시글 목록은 최신 게시글이 먼저 노출되도록 created_at DESC 기준으로 정렬한다.

댓글 목록은 대화 흐름을 유지하기 위해 created_at ASC 기준으로 정렬한다.

---

## 12. PR 전 검증 원칙

PR 생성 전 반드시 아래를 확인한다.

* DDL 기준 Entity 작성
* ApiResponse 적용
* AuthPrincipal 기반 memberId 사용
* ErrorCode 기반 예외 처리
* Swagger Docs 작성
* ./gradlew build 성공
