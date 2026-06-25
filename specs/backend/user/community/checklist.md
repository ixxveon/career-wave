# Checklist: Community API (User Community)

---

## DDL 기준 확인

* [ ] `boards` 테이블 기준으로 Board Entity를 작성했는가?
* [ ] `comments` 테이블 기준으로 Comment Entity를 작성했는가?
* [ ] `reports` 테이블 기준으로 Report Entity를 작성했는가?
* [ ] DDL 컬럼명과 Entity 필드 매핑이 일치하는가?
* [ ] DDL에 없는 Entity를 임의로 생성하지 않았는가?

---

## 게시글 기능 확인

* [ ] 게시글 목록 조회 API를 구현했는가?
* [ ] 게시글 상세 조회 API를 구현했는가?
* [ ] 게시글 작성 API를 구현했는가?
* [ ] 게시글 수정 API를 구현했는가?
* [ ] 게시글 삭제 API를 구현했는가?
* [ ] 게시글 목록은 `created_at DESC` 최신순으로 조회되는가?
* [ ] 카테고리 필터가 적용되는가?
* [ ] 제목/내용 키워드 검색이 적용되는가?
* [ ] 상세 조회 시 조회수가 증가하는가?
* [ ] 블라인드 게시글 응답 정책을 적용했는가?

---

## 댓글 기능 확인

* [ ] 댓글 작성 API를 구현했는가?
* [ ] 댓글 수정 API를 구현했는가?
* [ ] 댓글 삭제 API를 구현했는가?
* [ ] 게시글 상세 조회 시 댓글 목록이 포함되는가?
* [ ] 댓글은 `created_at ASC` 기준으로 조회되는가?
* [ ] 대댓글 parentId 검증이 적용되는가?
* [ ] 부모 댓글이 같은 게시글에 속하는지 검증하는가?
* [ ] 블라인드 댓글 응답 정책을 적용했는가?

---

## 신고 기능 확인

* [ ] 신고 생성 API를 구현했는가?
* [ ] targetType 검증이 적용되는가?
* [ ] reason 검증이 적용되는가?
* [ ] 신고 대상 존재 여부를 검증하는가?
* [ ] 신고당한 회원 memberId를 올바르게 저장하는가?
* [ ] 신고자 reporterId를 인증 사용자 기준으로 저장하는가?
* [ ] 동일 사용자의 동일 대상 중복 신고를 방지하는가?
* [ ] 신고 상태 기본값이 PENDING으로 저장되는가?

---

## 인증/인가 확인

* [ ] 쓰기 API에 JWT 인증이 적용되어 있는가?
* [ ] 쓰기 API에 USER 권한이 필요한가?
* [ ] Controller에서 `@AuthenticationPrincipal AuthPrincipal`을 사용하는가?
* [ ] 하드코딩된 memberId를 사용하지 않는가?
* [ ] 타인 게시글 수정/삭제가 차단되는가?
* [ ] 타인 댓글 수정/삭제가 차단되는가?

---

## API 응답 구조 확인

* [ ] 모든 응답이 `ApiResponse<T>`로 감싸져 있는가?
* [ ] 목록 조회 응답이 `PaginationResponse<T>` 구조를 따르는가?
* [ ] 게시글 상세 응답이 FE api-schema와 일치하는가?
* [ ] 댓글 응답이 FE api-schema와 일치하는가?
* [ ] 신고 응답이 FE api-schema와 일치하는가?
* [ ] 날짜 타입 응답 형식이 프로젝트 기준과 일치하는가?

---

## ErrorCode 확인

* [ ] `COMMUNITY_BOARD_NOT_FOUND`를 정의했는가?
* [ ] `COMMUNITY_COMMENT_NOT_FOUND`를 정의했는가?
* [ ] `COMMUNITY_ACCESS_DENIED`를 정의했는가?
* [ ] `COMMUNITY_INVALID_REPORT_TARGET`을 정의했는가?
* [ ] `COMMUNITY_INVALID_REPORT_REASON`을 정의했는가?
* [ ] `COMMUNITY_DUPLICATE_REPORT`를 정의했는가?
* [ ] 프로젝트 공통 예외 처리 방식과 일치하는가?
* [ ] 문자열 하드코딩 예외를 사용하지 않는가?

---

## Swagger Docs 확인

* [ ] `CommunityBoardControllerDocs.java`를 작성했는가?
* [ ] `CommunityCommentControllerDocs.java`를 작성했는가?
* [ ] `CommunityReportControllerDocs.java`를 작성했는가?
* [ ] 게시글 API가 문서화되었는가?
* [ ] 댓글 API가 문서화되었는가?
* [ ] 신고 API가 문서화되었는가?
* [ ] Swagger UI에서 정상 노출되는가?

---

## PR 전 확인

* [ ] `./gradlew build`가 성공하는가?
* [ ] 불필요한 import가 제거되었는가?
* [ ] 사용하지 않는 클래스가 제거되었는가?
* [ ] CodeRabbit 주요 리뷰를 반영했는가?
* [ ] PR 설명에 변경 내용을 정리했는가?
