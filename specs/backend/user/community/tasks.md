# Tasks: Community API (User Community)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Entity & Type 정의

* [ ] `Board.java` Entity

    * [ ] `board_id` BIGSERIAL PK
    * [ ] `member_id` UUID NOT NULL
    * [ ] `category` VARCHAR(30) NOT NULL
    * [ ] `title` VARCHAR(200) NOT NULL
    * [ ] `content` TEXT NOT NULL
    * [ ] `view_count` INTEGER NOT NULL DEFAULT 0
    * [ ] `is_blind` BOOLEAN NOT NULL DEFAULT FALSE
    * [ ] `created_at` TIMESTAMPTZ NOT NULL
    * [ ] `updated_at` TIMESTAMPTZ NOT NULL
    * [ ] `@Table(name = "boards")` 적용
    * [ ] DDL 컬럼명과 Entity 필드명 일치 확인

* [ ] `Comment.java` Entity

    * [ ] `comment_id` BIGSERIAL PK
    * [ ] `board_id` BIGINT NOT NULL
    * [ ] `member_id` UUID NOT NULL
    * [ ] `parent_id` BIGINT nullable
    * [ ] `content` TEXT NOT NULL
    * [ ] `is_blind` BOOLEAN NOT NULL DEFAULT FALSE
    * [ ] `created_at` TIMESTAMPTZ NOT NULL
    * [ ] `updated_at` TIMESTAMPTZ NOT NULL
    * [ ] `@Table(name = "comments")` 적용
    * [ ] DDL 컬럼명과 Entity 필드명 일치 확인

* [ ] `Report.java` Entity

    * [ ] `report_id` BIGSERIAL PK
    * [ ] `member_id` UUID NOT NULL
    * [ ] `reporter_id` UUID NOT NULL
    * [ ] `target_type` VARCHAR(20) NOT NULL
    * [ ] `target_id` BIGINT NOT NULL
    * [ ] `reason` VARCHAR(30) NOT NULL
    * [ ] `report_status` VARCHAR(20) NOT NULL DEFAULT PENDING
    * [ ] `ai_suggestion` TEXT nullable
    * [ ] `processed_by` BIGINT nullable
    * [ ] `processed_at` TIMESTAMPTZ nullable
    * [ ] `created_at` TIMESTAMPTZ NOT NULL
    * [ ] `updated_at` TIMESTAMPTZ NOT NULL
    * [ ] `@Table(name = "reports")` 적용
    * [ ] DDL 컬럼명과 Entity 필드명 일치 확인

* [ ] `ReportTargetType.java` Enum

    * [ ] `BOARD`
    * [ ] `COMMENT`
    * [ ] `MEMBER`

* [ ] `ReportReason.java` Enum

    * [ ] `SPAM`
    * [ ] `ABUSE`
    * [ ] `AD`
    * [ ] `INAPPROPRIATE`
    * [ ] `OTHER`

* [ ] `ReportStatus.java` Enum

    * [ ] `PENDING`
    * [ ] `BLINDED`
    * [ ] `DISMISSED`

---

## Phase 2 — DTO 정의

* [ ] `CommunityDTO.java`

    * [ ] `RequestCreateBoard`

        * [ ] category
        * [ ] title
        * [ ] content

    * [ ] `RequestUpdateBoard`

        * [ ] title
        * [ ] content

    * [ ] `BoardListItem`

        * [ ] boardId
        * [ ] category
        * [ ] title
        * [ ] contentPreview
        * [ ] memberId
        * [ ] viewCount
        * [ ] isBlind
        * [ ] commentCount
        * [ ] createdAt
        * [ ] updatedAt

    * [ ] `ResponseBoardDetail`

        * [ ] boardId
        * [ ] category
        * [ ] title
        * [ ] content
        * [ ] memberId
        * [ ] viewCount
        * [ ] isBlind
        * [ ] createdAt
        * [ ] updatedAt
        * [ ] comments

    * [ ] `RequestCreateComment`

        * [ ] parentId
        * [ ] content

    * [ ] `RequestUpdateComment`

        * [ ] content

    * [ ] `CommentItem`

        * [ ] commentId
        * [ ] boardId
        * [ ] memberId
        * [ ] parentId
        * [ ] content
        * [ ] isBlind
        * [ ] createdAt
        * [ ] updatedAt

    * [ ] `RequestCreateReport`

        * [ ] targetType
        * [ ] targetId
        * [ ] reason

    * [ ] `ResponseReport`

        * [ ] reportId
        * [ ] targetType
        * [ ] targetId
        * [ ] reason
        * [ ] reportStatus
        * [ ] createdAt

---

## Phase 3 — Repository 구현

* [ ] `BoardRepository.java`

    * [ ] `findByIsBlindFalseOrderByCreatedAtDesc(Pageable pageable)` 또는 정책에 맞는 목록 조회 쿼리
    * [ ] `findByBoardId(Long boardId)`
    * [ ] 카테고리 필터 조회
    * [ ] 키워드 검색 조회
    * [ ] 조회수 증가용 메서드 또는 Entity 메서드 준비

* [ ] `CommentRepository.java`

    * [ ] `findByBoardIdOrderByCreatedAtAsc(Long boardId)`
    * [ ] `findByCommentId(Long commentId)`
    * [ ] `countByBoardId(Long boardId)`
    * [ ] `existsByBoardIdAndCommentId(Long boardId, Long commentId)` 부모 댓글 검증용

* [ ] `ReportRepository.java`

    * [ ] `save(Report report)`
    * [ ] `existsByReporterIdAndTargetTypeAndTargetId(UUID reporterId, ReportTargetType targetType, Long targetId)` 중복 신고 방지

---

## Phase 4 — Service 구현

### CommunityBoardService

* [ ] `getBoards(int page, int size, String category, String keyword)`

    * [ ] 게시글 목록 조회
    * [ ] `created_at DESC` 최신순 정렬
    * [ ] 카테고리 필터 적용
    * [ ] 제목/내용 키워드 검색 적용
    * [ ] 댓글 수 포함
    * [ ] `PaginationResponse<BoardListItem>` 반환

* [ ] `getBoardDetail(Long boardId)`

    * [ ] 게시글 존재 여부 검증
    * [ ] 조회수 증가
    * [ ] 댓글 목록 조회
    * [ ] 블라인드 여부에 따른 응답 처리
    * [ ] `ResponseBoardDetail` 반환

* [ ] `createBoard(UUID memberId, RequestCreateBoard request)`

    * [ ] 제목/본문 필수 검증
    * [ ] 인증 사용자 memberId 저장
    * [ ] 게시글 저장
    * [ ] `ResponseBoardDetail` 반환

* [ ] `updateBoard(UUID memberId, Long boardId, RequestUpdateBoard request)`

    * [ ] 게시글 존재 여부 검증
    * [ ] 작성자 소유권 검증
    * [ ] 제목/본문 수정
    * [ ] `ResponseBoardDetail` 반환

* [ ] `deleteBoard(UUID memberId, Long boardId)`

    * [ ] 게시글 존재 여부 검증
    * [ ] 작성자 소유권 검증
    * [ ] 게시글 삭제
    * [ ] 반환: Void

---

### CommunityCommentService

* [ ] `createComment(UUID memberId, Long boardId, RequestCreateComment request)`

    * [ ] 게시글 존재 여부 검증
    * [ ] parentId가 있으면 부모 댓글 존재 여부 검증
    * [ ] 부모 댓글이 같은 게시글에 속하는지 검증
    * [ ] 댓글 저장
    * [ ] `CommentItem` 반환

* [ ] `updateComment(UUID memberId, Long commentId, RequestUpdateComment request)`

    * [ ] 댓글 존재 여부 검증
    * [ ] 작성자 소유권 검증
    * [ ] 댓글 내용 수정
    * [ ] `CommentItem` 반환

* [ ] `deleteComment(UUID memberId, Long commentId)`

    * [ ] 댓글 존재 여부 검증
    * [ ] 작성자 소유권 검증
    * [ ] 댓글 삭제
    * [ ] 반환: Void

---

### CommunityReportService

* [ ] `createReport(UUID reporterId, RequestCreateReport request)`

    * [ ] targetType 유효성 검증
    * [ ] reason 유효성 검증
    * [ ] 신고 대상 존재 여부 검증
    * [ ] 신고당한 회원 memberId 조회
    * [ ] 동일 사용자의 동일 대상 중복 신고 방지
    * [ ] report_status = PENDING으로 저장
    * [ ] `ResponseReport` 반환

---

## Phase 5 — Controller & Swagger Docs

* [ ] `CommunityBoardController.java`

    * [ ] `GET /api/v1/user/community/boards`
    * [ ] `GET /api/v1/user/community/boards/{boardId}`
    * [ ] `POST /api/v1/user/community/boards`
    * [ ] `PATCH /api/v1/user/community/boards/{boardId}`
    * [ ] `DELETE /api/v1/user/community/boards/{boardId}`
    * [ ] 쓰기 API에 `@AuthenticationPrincipal AuthPrincipal` 적용
    * [ ] 모든 응답 `ApiResponse<T>` 적용
    * [ ] Controller에서 try-catch 사용 금지

* [ ] `CommunityCommentController.java`

    * [ ] `POST /api/v1/user/community/boards/{boardId}/comments`
    * [ ] `PATCH /api/v1/user/community/comments/{commentId}`
    * [ ] `DELETE /api/v1/user/community/comments/{commentId}`
    * [ ] 모든 API에 `@AuthenticationPrincipal AuthPrincipal` 적용
    * [ ] 모든 응답 `ApiResponse<T>` 적용

* [ ] `CommunityReportController.java`

    * [ ] `POST /api/v1/user/community/reports`
    * [ ] `@AuthenticationPrincipal AuthPrincipal` 적용
    * [ ] `ApiResponse<ResponseReport>` 반환

* [ ] Swagger Docs 인터페이스 분리

    * [ ] `CommunityBoardControllerDocs.java`
    * [ ] `CommunityCommentControllerDocs.java`
    * [ ] `CommunityReportControllerDocs.java`

---

## Phase 6 — Security & ErrorCode

* [ ] Security 설정

    * [ ] `POST /api/v1/user/community/**` → USER 권한 필요
    * [ ] `PATCH /api/v1/user/community/**` → USER 권한 필요
    * [ ] `DELETE /api/v1/user/community/**` → USER 권한 필요
    * [ ] 조회 API 공개 여부는 프로젝트 정책에 맞춰 적용

* [ ] `CommunityErrorCode.java`

    * [ ] `COMMUNITY_BOARD_NOT_FOUND` (404)
    * [ ] `COMMUNITY_COMMENT_NOT_FOUND` (404)
    * [ ] `COMMUNITY_ACCESS_DENIED` (403)
    * [ ] `COMMUNITY_INVALID_REPORT_TARGET` (400)
    * [ ] `COMMUNITY_INVALID_REPORT_REASON` (400)
    * [ ] `COMMUNITY_DUPLICATE_REPORT` (409)
    * [ ] 중복 ErrorCode 존재 여부 확인
    * [ ] 프로젝트 공통 예외 처리 규칙에 맞게 적용

---

## Phase 7 — 검증

* [ ] checklist.md 전 항목 셀프 체크
* [ ] Swagger UI에서 API 요청/응답 확인
* [ ] DDL 컬럼과 Entity 매핑 일치 확인
* [ ] 게시글 목록 최신순 정렬 확인
* [ ] 카테고리 필터 조회 확인
* [ ] 키워드 검색 조회 확인
* [ ] 게시글 상세 조회 시 조회수 증가 확인
* [ ] 댓글 목록이 정상 반환되는지 확인
* [ ] 대댓글 parentId 검증 확인
* [ ] 타인 게시글 수정/삭제 시 403 반환 확인
* [ ] 타인 댓글 수정/삭제 시 403 반환 확인
* [ ] 중복 신고 시 409 반환 확인
* [ ] JWT 없는 상태에서 쓰기 API 호출 시 401 반환 확인
* [ ] FE api-schema와 실제 응답 필드명·타입 일치 확인
