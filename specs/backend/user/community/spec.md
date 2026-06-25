# Spec: Community API (User Community)

**Feature Branch**: `feature/user-community-be`
**버전**: v1
**Status**: 스펙 작성
**관련 FE 스펙**: `specs/frontend/user/community/spec.md`

---

## 도메인 개요

Community는 회원이 게시글과 댓글을 작성하고 조회할 수 있는 사용자 커뮤니티 기능이다.

사용자는 게시글 목록 조회, 게시글 상세 조회, 게시글 작성/수정/삭제, 댓글 작성/수정/삭제, 게시글 또는 댓글 신고를 수행할 수 있다.

* 모든 쓰기 API는 JWT 인증 + USER 권한 필수
* 목록/상세 조회는 공개 조회 가능 여부를 프로젝트 정책에 맞춰 적용
* 게시글과 댓글은 `member_id` 기준 소유권 검증 필수
* 타인 게시글/댓글 수정·삭제 시 403 반환
* 블라인드 처리된 게시글 또는 댓글은 일반 사용자에게 제한적으로 노출
* 데이터 기준 테이블은 `boards`, `comments`, `reports`

---

## ERD

### boards

| 컬럼           | 타입           | 제약                     | 설명         |
| ------------ | ------------ | ---------------------- | ---------- |
| `board_id`   | BIGSERIAL    | PK                     | 게시글 고유 식별자 |
| `member_id`  | UUID         | NOT NULL               | 작성 회원 FK   |
| `category`   | VARCHAR(30)  | NOT NULL               | 게시판 카테고리   |
| `title`      | VARCHAR(200) | NOT NULL               | 게시글 제목     |
| `content`    | TEXT         | NOT NULL               | 게시글 본문     |
| `view_count` | INTEGER      | NOT NULL DEFAULT 0     | 조회수        |
| `is_blind`   | BOOLEAN      | NOT NULL DEFAULT FALSE | 블라인드 처리 여부 |
| `created_at` | TIMESTAMPTZ  | NOT NULL DEFAULT now() | 작성 일시      |
| `updated_at` | TIMESTAMPTZ  | NOT NULL DEFAULT now() | 수정 일시      |

### comments

| 컬럼           | 타입          | 제약                     | 설명         |
| ------------ | ----------- | ---------------------- | ---------- |
| `comment_id` | BIGSERIAL   | PK                     | 댓글 고유 식별자  |
| `board_id`   | BIGINT      | NOT NULL               | 게시글 FK     |
| `member_id`  | UUID        | NOT NULL               | 작성 회원 FK   |
| `parent_id`  | BIGINT      | NULL                   | 부모 댓글 FK   |
| `content`    | TEXT        | NOT NULL               | 댓글 본문      |
| `is_blind`   | BOOLEAN     | NOT NULL DEFAULT FALSE | 블라인드 처리 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 작성 일시      |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 수정 일시      |

### reports

| 컬럼              | 타입          | 제약                       | 설명                       |
| --------------- | ----------- | ------------------------ | ------------------------ |
| `report_id`     | BIGSERIAL   | PK                       | 신고 고유 식별자                |
| `member_id`     | UUID        | NOT NULL                 | 신고당한 회원 FK               |
| `reporter_id`   | UUID        | NOT NULL                 | 신고한 회원 FK                |
| `target_type`   | VARCHAR(20) | NOT NULL                 | BOARD / COMMENT / MEMBER |
| `target_id`     | BIGINT      | NOT NULL                 | 신고 대상 ID                 |
| `reason`        | VARCHAR(30) | NOT NULL                 | 신고 사유                    |
| `report_status` | VARCHAR(20) | NOT NULL DEFAULT PENDING | 처리 상태                    |
| `ai_suggestion` | TEXT        | NULL                     | AI 검토 의견                 |
| `processed_by`  | BIGINT      | NULL                     | 처리 관리자 FK                |
| `processed_at`  | TIMESTAMPTZ | NULL                     | 처리 완료 일시                 |
| `created_at`    | TIMESTAMPTZ | NOT NULL DEFAULT now()   | 신고 접수 일시                 |
| `updated_at`    | TIMESTAMPTZ | NOT NULL DEFAULT now()   | 처리 상태 변경 일시              |

---

## 패키지 구조

```text
user/community/
├── controller/
│   ├── CommunityBoardController.java
│   ├── CommunityCommentController.java
│   └── CommunityReportController.java
├── service/
│   ├── CommunityBoardService.java
│   ├── CommunityCommentService.java
│   └── CommunityReportService.java
├── repository/
│   ├── BoardRepository.java
│   ├── CommentRepository.java
│   └── ReportRepository.java
├── entity/
│   ├── Board.java
│   ├── Comment.java
│   └── Report.java
├── dto/
│   └── CommunityDTO.java
├── type/
│   ├── ReportTargetType.java
│   ├── ReportReason.java
│   └── ReportStatus.java
├── exception/
│   └── CommunityErrorCode.java
└── docs/
    ├── CommunityBoardControllerDocs.java
    ├── CommunityCommentControllerDocs.java
    └── CommunityReportControllerDocs.java
```

---

## DTO 구조

```java
public class CommunityDTO {

    public record RequestCreateBoard(
        String category,
        String title,
        String content
    ) {}

    public record RequestUpdateBoard(
        String title,
        String content
    ) {}

    public record BoardListItem(
        Long boardId,
        String category,
        String title,
        String contentPreview,
        Long memberId,
        Integer viewCount,
        Boolean isBlind,
        Long commentCount,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
    ) {}

    public record ResponseBoardDetail(
        Long boardId,
        String category,
        String title,
        String content,
        String memberId,
        Integer viewCount,
        Boolean isBlind,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt,
        List<CommentItem> comments
    ) {}

    public record RequestCreateComment(
        Long parentId,
        String content
    ) {}

    public record RequestUpdateComment(
        String content
    ) {}

    public record CommentItem(
        Long commentId,
        Long boardId,
        String memberId,
        Long parentId,
        String content,
        Boolean isBlind,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
    ) {}

    public record RequestCreateReport(
        String targetType,
        Long targetId,
        String reason
    ) {}

    public record ResponseReport(
        Long reportId,
        String targetType,
        Long targetId,
        String reason,
        String reportStatus,
        ZonedDateTime createdAt
    ) {}
}
```

---

## API 명세

### 게시글 목록 조회

```http
GET /api/v1/user/community/boards?page=0&size=10&category=질문&keyword=면접
→ ApiResponse<PaginationResponse<CommunityDTO.BoardListItem>>
```

* 게시글 목록을 최신순으로 조회
* 카테고리 필터 지원
* 제목/내용 키워드 검색 지원
* 블라인드 게시글은 정책에 따라 제목/내용 제한 표시

---

### 게시글 상세 조회

```http
GET /api/v1/user/community/boards/{boardId}
→ ApiResponse<CommunityDTO.ResponseBoardDetail>
```

* 게시글 상세 정보 조회
* 댓글 목록 포함
* 조회 시 view_count 증가
* 블라인드 게시글은 일반 사용자에게 제한적으로 표시

---

### 게시글 작성

```http
POST /api/v1/user/community/boards
Body: CommunityDTO.RequestCreateBoard
→ ApiResponse<CommunityDTO.ResponseBoardDetail>
```

* JWT 인증 필수
* USER 권한 필수
* member_id는 인증 정보에서 추출
* title/content 필수

---

### 게시글 수정

```http
PATCH /api/v1/user/community/boards/{boardId}
Body: CommunityDTO.RequestUpdateBoard
→ ApiResponse<CommunityDTO.ResponseBoardDetail>
```

* 작성자 본인만 수정 가능
* 블라인드 처리된 게시글은 수정 제한 여부를 정책에 맞춰 적용

---

### 게시글 삭제

```http
DELETE /api/v1/user/community/boards/{boardId}
→ ApiResponse<Void>
```

* 작성자 본인만 삭제 가능
* 실제 삭제 방식은 물리 삭제 또는 소프트 삭제 정책에 맞춰 적용

---

### 댓글 작성

```http
POST /api/v1/user/community/boards/{boardId}/comments
Body: CommunityDTO.RequestCreateComment
→ ApiResponse<CommunityDTO.CommentItem>
```

* 게시글에 댓글 또는 대댓글 작성
* parentId가 있으면 대댓글로 처리
* parentId는 같은 boardId에 속한 댓글이어야 함

---

### 댓글 수정

```http
PATCH /api/v1/user/community/comments/{commentId}
Body: CommunityDTO.RequestUpdateComment
→ ApiResponse<CommunityDTO.CommentItem>
```

* 댓글 작성자 본인만 수정 가능

---

### 댓글 삭제

```http
DELETE /api/v1/user/community/comments/{commentId}
→ ApiResponse<Void>
```

* 댓글 작성자 본인만 삭제 가능
* 대댓글이 있는 댓글 삭제 정책은 프로젝트 정책에 맞춰 적용

---

### 신고 생성

```http
POST /api/v1/user/community/reports
Body: CommunityDTO.RequestCreateReport
→ ApiResponse<CommunityDTO.ResponseReport>
```

* 게시글, 댓글, 회원 신고 가능
* targetType은 BOARD / COMMENT / MEMBER
* reason은 SPAM / ABUSE / AD / INAPPROPRIATE / OTHER
* 동일 사용자의 동일 대상 중복 신고 정책은 구현 단계에서 확인

---

## 서비스 로직

### CommunityBoardService

#### getBoards(page, size, category, keyword)

* 게시글 목록 조회
* `created_at DESC` 정렬
* 카테고리 필터 적용
* 키워드 검색 적용
* 댓글 수 포함
* 반환: PaginationResponse<BoardListItem>

#### getBoardDetail(Long boardId)

* 게시글 존재 여부 검증
* 조회수 증가
* 댓글 목록 조회
* 블라인드 상태에 따른 응답 처리
* 반환: ResponseBoardDetail

#### createBoard(UUID memberId, RequestCreateBoard request)

* 인증 사용자 기준 memberId 설정
* 제목/본문 필수 검증
* 게시글 저장
* 반환: ResponseBoardDetail

#### updateBoard(UUID memberId, Long boardId, RequestUpdateBoard request)

* 게시글 존재 여부 검증
* 작성자 소유권 검증
* 제목/본문 수정
* 반환: ResponseBoardDetail

#### deleteBoard(UUID memberId, Long boardId)

* 게시글 존재 여부 검증
* 작성자 소유권 검증
* 게시글 삭제
* 반환: Void

---

### CommunityCommentService

#### createComment(UUID memberId, Long boardId, RequestCreateComment request)

* 게시글 존재 여부 검증
* parentId가 있으면 부모 댓글 존재 여부 검증
* 부모 댓글이 같은 게시글에 속하는지 검증
* 댓글 저장
* 반환: CommentItem

#### updateComment(UUID memberId, Long commentId, RequestUpdateComment request)

* 댓글 존재 여부 검증
* 작성자 소유권 검증
* 댓글 내용 수정
* 반환: CommentItem

#### deleteComment(UUID memberId, Long commentId)

* 댓글 존재 여부 검증
* 작성자 소유권 검증
* 댓글 삭제
* 반환: Void

---

### CommunityReportService

#### createReport(UUID reporterId, RequestCreateReport request)

* targetType 유효성 검증
* reason 유효성 검증
* 신고 대상 존재 여부 검증
* 신고당한 회원 memberId 조회
* 신고 저장
* 기본 status는 PENDING
* 반환: ResponseReport

---

## ErrorCode

| ErrorCode                         | HTTP | 발생 시점           |
| --------------------------------- | ---- | --------------- |
| `COMMUNITY_BOARD_NOT_FOUND`       | 404  | 존재하지 않는 게시글     |
| `COMMUNITY_COMMENT_NOT_FOUND`     | 404  | 존재하지 않는 댓글      |
| `COMMUNITY_ACCESS_DENIED`         | 403  | 타인 게시글/댓글 수정·삭제 |
| `COMMUNITY_INVALID_REPORT_TARGET` | 400  | 유효하지 않은 신고 대상   |
| `COMMUNITY_INVALID_REPORT_REASON` | 400  | 유효하지 않은 신고 사유   |
| `COMMUNITY_DUPLICATE_REPORT`      | 409  | 동일 대상 중복 신고     |
| `UNAUTHORIZED`                    | 401  | 토큰 없음 또는 만료     |

---

## Assumptions

* 게시글과 댓글 작성자는 `member_id`로 식별한다.
* 블라인드 처리는 관리자 도메인에서 수행하며, 사용자 API는 `is_blind` 상태를 기준으로 제한 응답한다.
* 게시글/댓글 삭제 방식은 프로젝트 정책에 따라 물리 삭제 또는 소프트 삭제로 결정한다.
* 신고 처리 상태 변경은 관리자 도메인에서 수행한다.
* 사용자 커뮤니티 API는 신고 생성까지만 담당한다.
* DDL 기준 테이블은 `boards`, `comments`, `reports`이다.
