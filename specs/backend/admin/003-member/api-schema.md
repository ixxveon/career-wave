# API Schema: 회원관리 (Member Management)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> HTTP 계약 원본은 `specs/frontend/admin/003-member/api-schema.md`를 기준으로 한다.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 보완한다.

---

## Controller 메서드 시그니처

```java
// 개인 회원 목록 조회
ResponseEntity<ApiResponse<Map<String, Object>>> getMembers(
    @RequestParam(required = false) String role,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String plan,
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) String startDate,
    @RequestParam(required = false) String endDate,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// 개인 회원 상세 조회
ResponseEntity<ApiResponse<MemberDTO.ResponseDetail>> getMemberDetail(
    @PathVariable UUID memberId
);

// 회원 제재 처리
ResponseEntity<ApiResponse<MemberDTO.ResponseSanction>> sanctionMember(
    @PathVariable UUID memberId,
    @RequestBody @Valid MemberDTO.RequestSanction request
);

// 기업 회원 목록 조회
ResponseEntity<ApiResponse<Map<String, Object>>> getHrManagers(
    @RequestParam(required = false) String hrStatus,
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) String startDate,
    @RequestParam(required = false) String endDate,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// 기업 회원 상세 조회
ResponseEntity<ApiResponse<HrManagerDTO.ResponseDetail>> getHrManagerDetail(
    @PathVariable UUID memberId
);

// 기업 회원 승인
ResponseEntity<ApiResponse<HrManagerDTO.ResponseApprove>> approveHrManager(
    @PathVariable UUID memberId
);

// 기업 회원 반려
ResponseEntity<ApiResponse<HrManagerDTO.ResponseReject>> rejectHrManager(
    @PathVariable UUID memberId,
    @RequestBody @Valid HrManagerDTO.RequestReject request
);
```

---

## 공통 응답 형식

```java
ApiResponse.ok(data);                    // 성공
ApiResponse.ok(message, data);           // 성공 + 메시지
ApiResponse.fail(statusCode, message);   // 실패
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

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | 개인 회원 조회 실패 |
| `HR_MANAGER_NOT_FOUND` | 404 | 기업 회원 조회 실패 |
| `ALREADY_BANNED` | 409 | BANNED 회원 재제재 시도 |
| `ALREADY_PROCESSED` | 409 | PENDING 아닌 기업 회원 승인/반려 시도 |
| `INVALID_MEMBER_FILTER` | 400 | 잘못된 필터 Enum 값 |
| `INVALID_SANCTION_DURATION` | 400 | SUSPEND 시 duration 미입력 |
| `REASON_REQUIRED` | 400 | 사유 미입력 |
| `REASON_TOO_SHORT` | 400 | 사유 10자 미만 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
