# API Schema: Community API (User Community)

---

## Base URL

```http
/api/v1/user/community
```

---

## 공통 응답 형식

모든 API 응답은 프로젝트 공통 응답 래퍼인 `ApiResponse<T>`를 사용한다.

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {}
}
```

---

## 1. 게시글 목록 조회

```http
GET /api/v1/user/community/boards?page=0&size=10&category=질문&keyword=면접
```

### Query Parameters

| 이름         | 타입      | 필수 | 기본값  | 설명        |
| ---------- | ------- | -- | ---- | --------- |
| `page`     | integer | N  | 0    | 페이지 번호    |
| `size`     | integer | N  | 10   | 페이지 크기    |
| `category` | string  | N  | null | 게시글 카테고리  |
| `keyword`  | string  | N  | null | 제목/내용 검색어 |

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {
    "content": [
      {
        "boardId": 1,
        "category": "질문",
        "title": "Spring 트랜잭션 질문드립니다.",
        "contentPreview": "면접 준비 중 트랜잭션 전파 속성이 헷갈립니다.",
        "memberId": "1f62a4d7-9dc3-4f20-b4d1-46b2e69c0001",
        "viewCount": 12,
        "isBlind": false,
        "commentCount": 3,
        "createdAt": "2026-06-24T10:30:00+09:00",
        "updatedAt": "2026-06-24T10:30:00+09:00"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "last": true
  }
}
```

---

## 2. 게시글 상세 조회

```http
GET /api/v1/user/community/boards/{boardId}
```

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "code": null,
  "data": {
    "boardId": 1,
    "category": "질문",
    "title": "Spring 트랜잭션 질문드립니다.",
    "content": "면접 준비 중 트랜잭션 전파 속성이 헷갈립니다.",
    "memberId": "1f62a4d7-9dc3-4f20-b4d1-46b2e69c0001",
    "viewCount": 13,
    "isBlind": false,
    "createdAt": "2026-06-24T10:30:00+09:00",
    "updatedAt": "2026-06-24T10:30:00+09:00",
    "comments": [
      {
        "commentId": 1,
        "boardId": 1,
        "memberId": "70d6ae5a-e20d-46dd-8cd4-b972761c0002",
        "parentId": null,
        "content": "REQUIRED와 REQUIRES_NEW 차이부터 정리해보세요.",
        "isBlind": false,
        "createdAt": "2026-06-24T10:40:00+09:00",
        "updatedAt": "2026-06-24T10:40:00+09:00"
      }
    ]
  }
}
```

---

## 3. 게시글 작성

```http
POST /api/v1/user/community/boards
```

### Request

```json
{
  "category": "질문",
  "title": "Spring 트랜잭션 질문드립니다.",
  "content": "면접 준비 중 트랜잭션 전파 속성이 헷갈립니다."
}
```

### Response

```json
{
  "success": true,
  "status": 201,
  "message": "게시글이 등록되었습니다.",
  "code": null,
  "data": {
    "boardId": 1,
    "category": "질문",
    "title": "Spring 트랜잭션 질문드립니다.",
    "content": "면접 준비 중 트랜잭션 전파 속성이 헷갈립니다.",
    "memberId": "1f62a4d7-9dc3-4f20-b4d1-46b2e69c0001",
    "viewCount": 0,
    "isBlind": false,
    "createdAt": "2026-06-24T10:30:00+09:00",
    "updatedAt": "2026-06-24T10:30:00+09:00",
    "comments": []
  }
}
```

---

## 4. 게시글 수정

```http
PATCH /api/v1/user/community/boards/{boardId}
```

### Request

```json
{
  "title": "Spring 트랜잭션 질문 수정합니다.",
  "content": "REQUIRED와 REQUIRES_NEW 차이가 궁금합니다."
}
```

---

## 5. 게시글 삭제

```http
DELETE /api/v1/user/community/boards/{boardId}
```

### Response

```json
{
  "success": true,
  "status": 200,
  "message": "게시글이 삭제되었습니다.",
  "code": null,
  "data": null
}
```

---

## 6. 댓글 작성

```http
POST /api/v1/user/community/boards/{boardId}/comments
```

### Request

```json
{
  "parentId": null,
  "content": "REQUIRED와 REQUIRES_NEW 차이부터 정리해보세요."
}
```

---

## 7. 댓글 수정

```http
PATCH /api/v1/user/community/comments/{commentId}
```

### Request

```json
{
  "content": "댓글 내용을 수정합니다."
}
```

---

## 8. 댓글 삭제

```http
DELETE /api/v1/user/community/comments/{commentId}
```

---

## 9. 신고 생성

```http
POST /api/v1/user/community/reports
```

### Request

```json
{
  "targetType": "BOARD",
  "targetId": 1,
  "reason": "SPAM"
}
```

### Response

```json
{
  "success": true,
  "status": 201,
  "message": "신고가 접수되었습니다.",
  "code": null,
  "data": {
    "reportId": 1,
    "targetType": "BOARD",
    "targetId": 1,
    "reason": "SPAM",
    "reportStatus": "PENDING",
    "createdAt": "2026-06-24T10:30:00+09:00"
  }
}
```

---

## Error Response

### 게시글 없음

```json
{
  "success": false,
  "status": 404,
  "message": "존재하지 않는 게시글입니다.",
  "code": "COMMUNITY_BOARD_NOT_FOUND",
  "data": null
}
```

### 댓글 없음

```json
{
  "success": false,
  "status": 404,
  "message": "존재하지 않는 댓글입니다.",
  "code": "COMMUNITY_COMMENT_NOT_FOUND",
  "data": null
}
```

### 권한 없음

```json
{
  "success": false,
  "status": 403,
  "message": "해당 커뮤니티 리소스에 접근할 수 없습니다.",
  "code": "COMMUNITY_ACCESS_DENIED",
  "data": null
}
```

### 중복 신고

```json
{
  "success": false,
  "status": 409,
  "message": "이미 신고한 대상입니다.",
  "code": "COMMUNITY_DUPLICATE_REPORT",
  "data": null
}
```
