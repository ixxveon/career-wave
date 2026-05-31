# API Schema: Member Auth

> 백엔드 통신을 위한 프론트엔드 계약안입니다.  
> 관련 문서: `constitution.md` / `plan.md` / `tasks.md` / `spec.md`  
> ERD 초안은 참고만 하며, 이 문서는 실제 연동 전 백엔드와 확정이 필요합니다.

---

## 공통

### Base URL

```txt
/api/v1/members
```

### 날짜 포맷

모든 날짜와 시간은 ISO 8601 형식을 사용한다. 예: `2026-05-31T12:30:00Z`

### 필드명 표기

DB 컬럼명은 snake_case(`member_id`)를 따르며, Frontend API DTO는 기존 user frontend 문서 관례에 따라 camelCase(`memberId`)를 사용한다.

### 인증

비로그인 API를 제외한 모든 API는 JWT Bearer 또는 HttpOnly cookie 기반 세션을 사용한다. 최종 방식은 백엔드 보안 정책으로 확정한다.

```txt
Authorization: Bearer {accessToken}
```

### 응답 공통 포맷

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

```json
{
  "success": false,
  "statusCode": 400,
  "message": "요청을 처리할 수 없습니다."
}
```

### 공통 Enum

| Enum | Values |
|------|--------|
| `MemberType` | `USER`, `COMPANY` |
| `MemberStatus` | `ACTIVE`, `SUSPENDED`, `BANNED`, `LOCKED`, `WITHDRAWN`, `BLACKLISTED` |
| `CompanyApprovalStatus` | `NONE`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION` |
| `VerificationChannel` | `EMAIL`, `PHONE` |
| `VerificationStatus` | `SENT`, `VERIFIED`, `EXPIRED`, `FAILED`, `RATE_LIMITED` |

### 공통 Error Cases

| statusCode | 상황 | 프론트 처리 |
|------------|------|-------------|
| `400` | 입력값 검증 실패 | 필드 오류 표시 |
| `401` | 인증 실패 또는 토큰 만료 | 로그인 페이지 이동 |
| `403` | 권한 없음, 승인 대기, 제재 상태 | 제한 안내 화면 |
| `409` | 아이디/이메일/사업자등록번호 중복 | 중복 안내 |
| `423` | 계정 잠금 | 보안 잠금 안내 |
| `429` | 인증번호/로그인 시도 rate limit | 재시도 제한 안내 |
| `500` | 서버 오류 | 재시도/고객센터 안내 |

---

## 1. 로그인

- **Endpoint**: `POST /api/v1/members/login`
- **Content-Type**: `application/json`

### Request

```json
{
  "loginId": "career_user01",
  "password": "Password123!",
  "memberType": "USER"
}
```

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `loginId` | `string` | Y | 로그인 아이디 |
| `password` | `string` | Y | 비밀번호 |
| `memberType` | `MemberType` | Y | 개인/기업 로그인 탭 값 |

### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "jwt-access-token",
    "member": {
      "memberId": "uuid-v4",
      "loginId": "career_user01",
      "name": "홍길동",
      "memberType": "USER",
      "memberStatus": "ACTIVE",
      "companyApprovalStatus": "NONE",
      "lastLoginAt": "2026-05-31T12:30:00Z"
    }
  }
}
```

### Error Cases

| statusCode | 상황 |
|------------|------|
| `401` | 아이디 또는 비밀번호 불일치 |
| `403` | 승인 대기 기업회원 또는 제재 계정 |
| `423` | 반복 실패로 잠긴 계정 |
| `429` | 로그인 시도 횟수 초과 |

---

## 2. 아이디 중복 확인

- **Endpoint**: `GET /api/v1/members/login-id/check?loginId={loginId}`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "사용 가능한 아이디입니다.",
  "data": {
    "available": true
  }
}
```

---

## 3. 인증번호 발송

- **Endpoint**: `POST /api/v1/members/verifications/send`

### Request

```json
{
  "channel": "EMAIL",
  "target": "user@example.com",
  "purpose": "REGISTER"
}
```

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `channel` | `EMAIL` \| `PHONE` | Y | 인증 수단 |
| `target` | `string` | Y | 이메일 또는 휴대폰 번호 |
| `purpose` | `REGISTER` \| `FIND_ID` \| `RESET_PASSWORD` | Y | 인증 목적 |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "인증번호가 발송되었습니다.",
  "data": {
    "verificationId": "uuid-v4",
    "expiresAt": "2026-05-31T12:35:00Z",
    "resendAvailableAt": "2026-05-31T12:31:00Z",
    "remainingAttempts": 5
  }
}
```

---

## 4. 인증번호 확인

- **Endpoint**: `POST /api/v1/members/verifications/confirm`

### Request

```json
{
  "verificationId": "uuid-v4",
  "code": "123456"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "인증이 완료되었습니다.",
  "data": {
    "verificationToken": "short-lived-token",
    "verifiedAt": "2026-05-31T12:32:00Z"
  }
}
```

> `verificationToken`은 회원가입/아이디 찾기/비밀번호 재설정 요청 시 서버 검증용으로 사용한다. 프론트 boolean만으로 인증 완료를 판단하지 않는다.

---

## 5. 개인회원 가입

- **Endpoint**: `POST /api/v1/members/register/user`

### Request

```json
{
  "loginId": "career_user01",
  "password": "Password123!",
  "name": "홍길동",
  "email": "user@example.com",
  "phone": "01012345678",
  "emailVerificationToken": "short-lived-token",
  "phoneVerificationToken": "short-lived-token",
  "terms": {
    "service": true,
    "privacy": true,
    "marketing": false
  }
}
```

### Response

```json
{
  "success": true,
  "statusCode": 201,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "memberType": "USER",
    "memberStatus": "ACTIVE"
  }
}
```

---

## 6. 기업회원 가입

- **Endpoint**: `POST /api/v1/members/register/company`
- **Content-Type**: `multipart/form-data` 또는 선업로드 후 JSON 계약 중 택1 필요

### Request JSON 계약안

```json
{
  "loginId": "company_hr01",
  "password": "Password123!",
  "managerName": "김담당",
  "managerEmail": "hr@example.com",
  "managerPhone": "01098765432",
  "companyName": "커리어웨이브",
  "businessNumber": "1234567890",
  "ceoName": "대표자",
  "address": "서울시 강남구",
  "addressDetail": "10층",
  "companyType": "SME",
  "isAgency": false,
  "managerVerificationToken": "short-lived-token",
  "employmentCertificateFileId": "uploaded-file-id",
  "terms": {
    "service": true,
    "privacy": true,
    "companyVerification": true,
    "marketing": false
  }
}
```

### Response

```json
{
  "success": true,
  "statusCode": 201,
  "message": "기업회원 가입 신청이 완료되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "companyProfileId": "uuid-v4",
    "memberType": "COMPANY",
    "memberStatus": "ACTIVE",
    "companyApprovalStatus": "PENDING_REVIEW"
  }
}
```

---

## 7. 재직증명서 PDF 업로드

- **Endpoint**: `POST /api/v1/members/company/employment-certificate`
- **Content-Type**: `multipart/form-data`

### Request

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `file` | `File` | Y | PDF, max size 백엔드 확정 필요 |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "파일이 업로드되었습니다.",
  "data": {
    "fileId": "uploaded-file-id",
    "originalName": "employment_certificate.pdf",
    "mimeType": "application/pdf",
    "size": 1200000,
    "uploadedAt": "2026-05-31T12:30:00Z"
  }
}
```

---

## 8. 아이디 찾기

- **Endpoint**: `POST /api/v1/members/recovery/find-id`

### Request

```json
{
  "memberType": "USER",
  "verificationToken": "short-lived-token"
}
```

기업회원은 추가 식별값을 포함한다.

```json
{
  "memberType": "COMPANY",
  "managerName": "김담당",
  "businessNumber": "1234567890",
  "verificationToken": "short-lived-token"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 처리되었습니다.",
  "data": {
    "maskedLoginIds": ["caree***01"],
    "found": true
  }
}
```

> 보안 정책에 따라 `found=false`도 동일한 일반 메시지를 사용할 수 있다.

---

## 9. 비밀번호 재설정 권한 발급

- **Endpoint**: `POST /api/v1/members/recovery/password-token`

### Request

```json
{
  "memberType": "USER",
  "loginId": "career_user01",
  "verificationToken": "short-lived-token"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "비밀번호를 재설정할 수 있습니다.",
  "data": {
    "resetToken": "password-reset-token",
    "expiresAt": "2026-05-31T12:40:00Z"
  }
}
```

---

## 10. 비밀번호 재설정

- **Endpoint**: `POST /api/v1/members/recovery/reset-password`

### Request

```json
{
  "resetToken": "password-reset-token",
  "newPassword": "NewPassword123!"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "비밀번호가 변경되었습니다.",
  "data": {
    "changedAt": "2026-05-31T12:39:00Z"
  }
}
```

---

## 11. 내 회원 상태 조회

- **Endpoint**: `GET /api/v1/members/me/status`
- **인증**: 필요

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "memberType": "COMPANY",
    "memberStatus": "ACTIVE",
    "companyApprovalStatus": "PENDING_REVIEW",
    "restriction": null
  }
}
```

### Restriction 예시

```json
{
  "restrictionType": "SUSPENDED",
  "recoverable": true,
  "availableAt": "2026-06-07T00:00:00Z",
  "messageCode": "ACCOUNT_RESTRICTED"
}
```
