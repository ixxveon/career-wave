# API Schema: 사용자 고객센터 (User Support)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> HTTP 계약 원본은 `specs/frontend/user/006-support/api-schema.md`를 기준으로 한다.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 보완한다.

---

## Controller 메서드 시그니처

### UserNoticeController

```java
// 공지사항 목록 (비인증 허용)
ResponseEntity<ApiResponse<PaginationResponse<SupportDTO.NoticeList>>> getNotices(
    @RequestParam(required = false) String category,
    @RequestParam(required = false) String keyword,
    @RequestParam(defaultValue = "1") @Min(1) int page,
    @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
);

// 공지사항 상세 (비인증 허용, view_count 증가)
ResponseEntity<ApiResponse<SupportDTO.NoticeDetail>> getNoticeDetail(
    @PathVariable Long noticeId
);
```

### UserFaqController

```java
// FAQ 목록 (비인증 허용)
ResponseEntity<ApiResponse<List<SupportDTO.FaqItem>>> getFaqs(
    @RequestParam(required = false) String category,
    @RequestParam(required = false) String keyword
);
```

### UserInquiryController

```java
// 나의 문의 목록 (USER 인증 필수)
ResponseEntity<ApiResponse<List<SupportDTO.InquiryList>>> getMyInquiries(
    @RequestParam(required = false) String category,
    @AuthenticationPrincipal UserPrincipal user
);

// 문의 접수 (USER 인증 필수)
ResponseEntity<ApiResponse<SupportDTO.ResponseCreateInquiry>> createInquiry(
    @RequestBody @Valid SupportDTO.RequestCreateInquiry request,
    @AuthenticationPrincipal UserPrincipal user
);
```

---

## 공통 응답 형식

```java
ApiResponse.ok(data);
// 문의 접수 201 응답 — ApiResponse에 created() 메서드가 없는 경우 아래 방식 사용
ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
ApiResponse.fail(statusCode, message);
```

> `ApiResponse.created()` 메서드 존재 여부는 구현 단계에서 확인.
> 없을 경우 `ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data))` 사용.

---

## 페이지네이션 응답 형식 (공지사항 목록)

```java
PaginationResponse<T> result = new PaginationResponse<>(
    page.getContent().stream().map(...).toList(),
    pageNum,               // 1-based
    page.getSize(),
    page.getTotalElements(),
    page.getTotalPages()
);
return ApiResponse.ok(result);
```

> `PaginationResponse<T>`는 `common/dto/` 패키지 공통 사용.

---

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 공지사항 조회 실패 또는 `is_visible=false` |
| `UNAUTHORIZED` | 401 | 문의 목록·접수 시 미인증 |
| `INVALID_INQUIRY_CONTENT` | 400 | 문의 내용 10자 미만 (`@Size(min=10)` 위반) |
