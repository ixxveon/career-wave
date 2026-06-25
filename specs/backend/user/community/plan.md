# Plan: Community API (User Community)

---

## 목표

DDL 기준으로 사용자 커뮤니티 API를 구현한다.

Community는 사용자가 게시글과 댓글을 작성하고, 게시글·댓글·회원 신고를 생성할 수 있는 기능이다.

기준 데이터는 `boards`, `comments`, `reports` 테이블이다.

---

## Phase 1 — Entity & Type 정의

DDL 기준으로 커뮤니티 기능에 필요한 Entity와 Enum Type을 정의한다.

* Board
* Comment
* Report
* ReportTargetType
* ReportReason
* ReportStatus

DDL에 없는 별도 테이블 기반 Entity는 생성하지 않는다.

---

## Phase 2 — DTO 정의

Community API 요청/응답 전용 DTO를 정의한다.

* 게시글 작성 요청
* 게시글 수정 요청
* 게시글 목록 항목
* 게시글 상세 응답
* 댓글 작성 요청
* 댓글 수정 요청
* 댓글 응답 항목
* 신고 생성 요청
* 신고 응답

---

## Phase 3 — Repository 구현

DDL 기준 테이블 조회 및 저장을 위한 Repository를 구성한다.

* BoardRepository
* CommentRepository
* ReportRepository

목록 조회는 최신순 정렬, 카테고리 필터, 키워드 검색을 지원한다.

---

## Phase 4 — Service 구현

Community Service에서 비즈니스 로직을 구현한다.

* 게시글 목록 조회
* 게시글 상세 조회
* 게시글 작성
* 게시글 수정
* 게시글 삭제
* 댓글 작성
* 댓글 수정
* 댓글 삭제
* 신고 생성

게시글과 댓글 수정·삭제는 작성자 소유권 검증을 포함한다.

---

## Phase 5 — Controller & Swagger Docs

사용자 Community API Controller와 Swagger Docs를 구현한다.

* 게시글 API
* 댓글 API
* 신고 API

모든 응답은 `ApiResponse<T>` 래퍼를 사용한다.

Controller에서는 try-catch를 사용하지 않고, 공통 예외 처리에 위임한다.

---

## Phase 6 — Security & ErrorCode

Community API 접근 권한과 예외 코드를 정의한다.

* 쓰기 API는 JWT 인증 필수
* 쓰기 API는 USER 권한 필수
* 타인 게시글/댓글 수정·삭제 차단
* 존재하지 않는 게시글/댓글 예외 처리
* 유효하지 않은 신고 대상/사유 예외 처리
* 중복 신고 예외 처리

---

## Phase 7 — 검증

Swagger UI와 빌드를 통해 API 계약과 DDL 매핑을 검증한다.

* DDL 컬럼과 Entity 매핑 일치 확인
* 게시글 목록 조회 확인
* 게시글 상세 조회 확인
* 댓글 작성/수정/삭제 확인
* 신고 생성 확인
* 소유권 검증 확인
* FE api-schema와 응답 필드 일치 확인

---

## Phase 8 — PR 전 최종 점검

DDL 기준 외 임의 Entity, Repository, DTO가 포함되지 않았는지 확인한다.

* ApiResponse 적용
* AuthPrincipal 기반 memberId 적용
* ErrorCode 기반 예외 처리 적용
* Swagger Docs 분리
* Build 성공 후 PR 생성
