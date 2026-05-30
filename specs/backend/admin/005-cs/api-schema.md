# API Schema: 고객센터 관리 (Customer Service)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> HTTP 계약 원본은 `specs/frontend/admin/005-cs/api-schema.md`를 기준으로 한다.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 보완한다.

---

## Controller 메서드 시그니처

### AdminCsController

```java
// KPI 집계 조회
ResponseEntity<ApiResponse<CsDTO.ResponseSummary>> getSummary();
```

### AdminNoticeController

```java
// 공지사항 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<NoticeDTO.ResponseList>>> getNotices(
    @RequestParam(required = false) String category,
    @RequestParam(required = false) Boolean visible,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// 공지사항 단건 조회
ResponseEntity<ApiResponse<NoticeDTO.ResponseDetail>> getNoticeDetail(
    @PathVariable Long noticeId
);

// 공지사항 등록
ResponseEntity<ApiResponse<NoticeDTO.ResponseResult>> createNotice(
    @RequestBody @Valid NoticeDTO.RequestCreate request,
    @AuthenticationPrincipal AdminPrincipal admin
);

// 공지사항 수정
ResponseEntity<ApiResponse<NoticeDTO.ResponseResult>> updateNotice(
    @PathVariable Long noticeId,
    @RequestBody @Valid NoticeDTO.RequestUpdate request
);

// 공지사항 삭제
ResponseEntity<ApiResponse<Void>> deleteNotice(
    @PathVariable Long noticeId
);
```

### AdminFaqController

```java
// FAQ 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<FaqDTO.ResponseList>>> getFaqs(
    @RequestParam(required = false) String category,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// FAQ 등록
ResponseEntity<ApiResponse<FaqDTO.ResponseResult>> createFaq(
    @RequestBody @Valid FaqDTO.RequestCreate request,
    @AuthenticationPrincipal AdminPrincipal admin
);

// FAQ 수정
ResponseEntity<ApiResponse<FaqDTO.ResponseResult>> updateFaq(
    @PathVariable Long faqId,
    @RequestBody @Valid FaqDTO.RequestUpdate request
);

// FAQ 삭제
ResponseEntity<ApiResponse<Void>> deleteFaq(
    @PathVariable Long faqId
);
```

### AdminInquiryController

```java
// 문의 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<InquiryDTO.ResponseList>>> getInquiries(
    @RequestParam(required = false) String category,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String keyword,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// 문의 상세 조회
ResponseEntity<ApiResponse<InquiryDTO.ResponseDetail>> getInquiryDetail(
    @PathVariable Long inquiryId
);

// 답변 저장
ResponseEntity<ApiResponse<InquiryDTO.ResponseReply>> saveReply(
    @PathVariable Long inquiryId,
    @RequestBody @Valid InquiryDTO.RequestReply request,
    @AuthenticationPrincipal AdminPrincipal admin
);

// 처리 완료
ResponseEntity<ApiResponse<InquiryDTO.ResponseComplete>> completeInquiry(
    @PathVariable Long inquiryId,
    @AuthenticationPrincipal AdminPrincipal admin
);

// AI 초안 — 공지
ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateNoticeDraft(
    @RequestBody @Valid AiDTO.RequestNoticeDraft request
);

// AI 초안 — FAQ
ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateFaqDraft(
    @RequestBody @Valid AiDTO.RequestFaqDraft request
);

// AI 초안 — 문의
ResponseEntity<ApiResponse<AiDTO.ResponseDraft>> generateInquiryDraft(
    @RequestBody @Valid AiDTO.RequestInquiryDraft request
);
```

---

## 공통 응답 형식

```java
ApiResponse.ok(data);             // 200 성공
ApiResponse.ok(message, data);    // 200 성공 + 메시지
ApiResponse.fail(statusCode, message);  // 실패
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

---

## 페이지네이션 응답 형식

```java
// Service에서 PaginationResponse로 변환 (Spring Page 객체 직접 반환 금지)
PaginationResponse<T> result = new PaginationResponse<>(
    page.getContent().stream().map(...).toList(),
    pageNum,                   // 1-based (요청값 그대로)
    page.getSize(),
    page.getTotalElements(),
    page.getTotalPages()
);
return ApiResponse.ok(result);
```

> `PaginationResponse<T>`는 `common/dto/` 패키지에 공통 선언한다.
> 반환 필드: `items`, `page`, `size`, `totalItems`, `totalPages`

---

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 공지사항 조회·수정·삭제 실패 |
| `FAQ_NOT_FOUND` | 404 | FAQ 조회·수정·삭제 실패 |
| `INQUIRY_NOT_FOUND` | 404 | 문의 조회·답변·완료 처리 실패 |
| `INQUIRY_ALREADY_COMPLETED` | 409 | COMPLETED 문의 답변 수정 시도 |
| `INQUIRY_NOT_IN_PROGRESS` | 400 | IN_PROGRESS 아닌 문의 처리 완료 시도 |
| `AI_SERVER_UNAVAILABLE` | 503 | FastAPI 타임아웃(10초) 초과 또는 연결 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |

