# API Schema: 고객센터 관리 (Customer Service)

> 프론트엔드 ↔ 어드민 백엔드 간 데이터 계약.
> 현재는 더미 데이터 기반이며, API 연동 시 이 계약을 기준으로 개발한다.
> 모든 응답은 `ApiResponse<T>` 형식을 사용한다.

---

## 공통 응답 형식

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

---

## Enums

| 타입 | 값 |
|---|---|
| `NoticeCategory` | `NOTICE` \| `UPDATE` \| `EVENT` \| `MAINTENANCE` |
| `FaqCategory` | `ACCOUNT` \| `PAYMENT` \| `SERVICE` \| `ETC` |
| `InquiryCategory` | `REFUND` \| `PAYMENT_ERROR` \| `SERVICE` \| `ACCOUNT` \| `ETC` |
| `InquiryStatus` | `PENDING` \| `IN_PROGRESS` \| `COMPLETED` |

### 한글 매핑

| Enum | 표시 |
|---|---|
| `NOTICE` | 공지 |
| `UPDATE` | 업데이트 |
| `EVENT` | 이벤트 |
| `MAINTENANCE` | 점검 |
| `ACCOUNT` | 계정 |
| `PAYMENT` | 결제 |
| `SERVICE` | 서비스 |
| `ETC` | 기타 |
| `REFUND` | 환불 |
| `PAYMENT_ERROR` | 결제오류 |
| `PENDING` | 접수 중 |
| `IN_PROGRESS` | 답변 중 |
| `COMPLETED` | 완료 |

---

## 1. KPI 집계 조회

```http
GET /api/admin/cs/summary
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "noticeCount": 12,
    "faqCount": 34,
    "pendingCount": 8,
    "inProgressCount": 3
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `noticeCount` | number | 등록된 공지사항 수 |
| `faqCount` | number | 등록된 FAQ 수 |
| `pendingCount` | number | 미답변(PENDING) 문의 수 |
| `inProgressCount` | number | 답변 중(IN_PROGRESS) 문의 수 |

---

## 2. 공지사항 목록 조회

```http
GET /api/admin/notices
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `category` | string | N | `NOTICE` \| `UPDATE` \| `EVENT` \| `MAINTENANCE` — 생략 시 전체 |
| `visible` | boolean | N | 노출 여부 필터 — 생략 시 전체 |
| `page` | number | N | 페이지 번호 (기본값: 1) |
| `size` | number | N | 페이지당 건수 (기본값: 20) |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "items": [
      {
        "noticeId": 1,
        "category": "NOTICE",
        "title": "Career Wave 서비스 오픈 안내",
        "isVisible": true,
        "createdAt": "2026-05-20T10:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 12,
    "totalPages": 1
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 3. 공지사항 단건 조회

```http
GET /api/admin/notices/{noticeId}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "noticeId": 1,
    "category": "NOTICE",
    "title": "Career Wave 서비스 오픈 안내",
    "content": "안녕하세요. Career Wave 서비스가 정식 오픈했습니다...",
    "isVisible": true,
    "createdAt": "2026-05-20T10:00:00Z",
    "updatedAt": "2026-05-20T10:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 존재하지 않는 공지사항입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 4. 공지사항 등록

```http
POST /api/admin/notices
```

### Request Body

```json
{
  "category": "NOTICE",
  "title": "공지 제목",
  "content": "공지 내용",
  "isVisible": true
}
```

### Response

```json
{
  "success": true,
  "statusCode": 201,
  "message": "공지사항이 등록되었습니다.",
  "data": {
    "noticeId": 13
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 5. 공지사항 수정

```http
PUT /api/admin/notices/{noticeId}
```

### Request Body

```json
{
  "category": "UPDATE",
  "title": "수정된 제목",
  "content": "수정된 내용",
  "isVisible": false
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "공지사항이 수정되었습니다.",
  "data": {
    "noticeId": 1,
    "updatedAt": "2026-05-30T12:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 존재하지 않는 공지사항입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 6. 공지사항 삭제

```http
DELETE /api/admin/notices/{noticeId}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "공지사항이 삭제되었습니다.",
  "data": null
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 존재하지 않는 공지사항입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 7. FAQ 목록 조회

```http
GET /api/admin/faqs
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `category` | string | N | `ACCOUNT` \| `PAYMENT` \| `SERVICE` \| `ETC` — 생략 시 전체 |
| `page` | number | N | 페이지 번호 (기본값: 1) |
| `size` | number | N | 페이지당 건수 (기본값: 20) |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "items": [
      {
        "faqId": 1,
        "category": "PAYMENT",
        "question": "구독 환불은 어떻게 하나요?",
        "createdAt": "2026-05-20T10:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 34,
    "totalPages": 2
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 8. FAQ 등록

```http
POST /api/admin/faqs
```

### Request Body

```json
{
  "category": "PAYMENT",
  "question": "구독 환불은 어떻게 하나요?",
  "answer": "구독 결제일로부터 7일 이내, AI 기능 미이용 시 전액 환불 가능합니다."
}
```

### Response

```json
{
  "success": true,
  "statusCode": 201,
  "message": "FAQ가 등록되었습니다.",
  "data": {
    "faqId": 35
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 9. FAQ 수정

```http
PUT /api/admin/faqs/{faqId}
```

### Request Body

```json
{
  "category": "PAYMENT",
  "question": "수정된 질문",
  "answer": "수정된 답변"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "FAQ가 수정되었습니다.",
  "data": {
    "faqId": 1,
    "updatedAt": "2026-05-30T12:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `FAQ_NOT_FOUND` | 404 | 존재하지 않는 FAQ입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 10. FAQ 삭제

```http
DELETE /api/admin/faqs/{faqId}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "FAQ가 삭제되었습니다.",
  "data": null
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `FAQ_NOT_FOUND` | 404 | 존재하지 않는 FAQ입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 11. 1:1 문의 목록 조회

```http
GET /api/admin/inquiries
```

### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `category` | string | N | `REFUND` \| `PAYMENT_ERROR` \| `SERVICE` \| `ACCOUNT` \| `ETC` — 생략 시 전체 |
| `status` | string | N | `PENDING` \| `IN_PROGRESS` \| `COMPLETED` — 생략 시 전체 |
| `keyword` | string | N | 회원명·제목 통합 검색 |
| `page` | number | N | 페이지 번호 (기본값: 1) |
| `size` | number | N | 페이지당 건수 (기본값: 20) |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "items": [
      {
        "inquiryId": 501,
        "memberName": "김민지",
        "category": "PAYMENT_ERROR",
        "title": "결제 오류가 계속 발생합니다",
        "inquiryStatus": "PENDING",
        "createdAt": "2026-05-22T09:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 42,
    "totalPages": 3
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 12. 1:1 문의 상세 조회

```http
GET /api/admin/inquiries/{inquiryId}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "inquiryId": 501,
    "memberName": "김민지",
    "category": "PAYMENT_ERROR",
    "title": "결제 오류가 계속 발생합니다",
    "content": "어제부터 결제를 시도하면 계속 오류가 나요...",
    "reply": null,
    "inquiryStatus": "PENDING",
    "createdAt": "2026-05-22T09:00:00Z",
    "repliedAt": null,
    "completedAt": null
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `INQUIRY_NOT_FOUND` | 404 | 존재하지 않는 문의입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 13. 1:1 문의 답변 저장

```http
PUT /api/admin/inquiries/{inquiryId}/reply
```

### Request Body

```json
{
  "reply": "안녕하세요, 김민지 님. 불편을 드려 죄송합니다..."
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "답변이 저장되었습니다.",
  "data": {
    "inquiryId": 501,
    "inquiryStatus": "IN_PROGRESS",
    "repliedAt": "2026-05-30T14:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `INQUIRY_NOT_FOUND` | 404 | 존재하지 않는 문의입니다. |
| `INQUIRY_ALREADY_COMPLETED` | 409 | 이미 완료된 문의입니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 14. 1:1 문의 처리 완료

```http
PUT /api/admin/inquiries/{inquiryId}/complete
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "문의가 처리 완료되었습니다.",
  "data": {
    "inquiryId": 501,
    "inquiryStatus": "COMPLETED",
    "completedAt": "2026-05-30T15:00:00Z"
  }
}
```

### Errors

| 코드 | 상태 | 메시지 |
|---|---|---|
| `INQUIRY_NOT_FOUND` | 404 | 존재하지 않는 문의입니다. |
| `INQUIRY_NOT_IN_PROGRESS` | 400 | 답변 저장 후 처리 완료할 수 있습니다. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

## 15. AI 초안 생성

### 공지 초안

```http
POST /api/admin/ai/notice-draft
```

**Request Body**:
```json
{
  "category": "MAINTENANCE",
  "title": "서버 점검 안내"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "초안이 생성되었습니다.",
  "data": {
    "draft": "안녕하세요. Career Wave 서비스 점검 안내드립니다..."
  }
}
```

### FAQ 답변 초안

```http
POST /api/admin/ai/faq-draft
```

**Request Body**:
```json
{
  "question": "구독 환불은 어떻게 하나요?"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "초안이 생성되었습니다.",
  "data": {
    "draft": "구독 결제일로부터 7일 이내, AI 기능 미이용 시 전액 환불 가능합니다..."
  }
}
```

### 문의 답변 초안

```http
POST /api/admin/ai/inquiry-draft
```

**Request Body**:
```json
{
  "category": "REFUND",
  "title": "구독 환불 요청드립니다",
  "content": "결제한 지 3일밖에 안 됐고 AI 기능은 한 번도 사용하지 않았습니다."
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "초안이 생성되었습니다.",
  "data": {
    "draft": "안녕하세요, Career Wave 고객센터입니다. 환불 요청 접수해 주셔서 감사합니다..."
  }
}
```

### AI Errors (공통)

| 코드 | 상태 | 메시지 |
|---|---|---|
| `AI_SERVER_UNAVAILABLE` | 503 | AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요. |
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |
