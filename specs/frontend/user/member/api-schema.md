# API Schema: Member Auth

> 백엔드 통신을 위한 프론트엔드 계약안입니다.  
> 관련 문서: `constitution.md` / `plan.md` / `tasks.md` / `spec.md`  
> ERD 초안은 참고만 하며, 이 문서는 실제 연동 전 백엔드와 확정이 필요합니다.

---

## 공통

### Base URL

```txt
/api/v1/user/members
```

### 날짜 포맷

모든 날짜와 시간은 ISO 8601 형식을 사용한다. 예: `2026-05-31T12:30:00Z`

### 필드명 표기

DB 컬럼명은 snake_case(`member_id`)를 따르며, Frontend API DTO는 기존 user frontend 문서 관례에 따라 camelCase(`memberId`)를 사용한다.

### 인증

비로그인 API를 제외한 모든 API는 **JWT Bearer access token** 인증을 사용한다.

* access token은 브라우저 메모리 또는 인증 전용 상태에만 보관하고 `localStorage`에 저장하지 않는다.
* refresh token은 HttpOnly Secure SameSite cookie를 우선 사용하며, 백엔드 제약이 있으면 `sessionStorage` 기반 탭 세션 복원을 보안 대안으로 사용할 수 있다.
* 앱 초기화 시 refresh cookie, `sessionStorage` 보관 refresh token, 또는 동등한 보안 전략을 사용해 세션 복원을 1회 시도할 수 있어야 한다.
* API client는 401 응답 수신 시 access token 갱신 또는 세션 복원을 1회 시도할 수 있다. 이 자동 재시도는 `GET`, `HEAD`, `OPTIONS` 같은 안전/멱등 요청에 한해 적용하며, `POST`, `PUT`, `PATCH`, `DELETE` 같은 상태 변경 요청은 idempotency key 또는 endpoint 계약으로 명시적 재전송 허용이 없는 한 자동 재전송하지 않는다. 재시도 또는 세션 복원에 실패하면 세션을 정리한 뒤 `/auth/login`으로 이동한다.
* Bearer token 기반 API는 CSRF 토큰을 요구하지 않는다. 단, refresh cookie 기반 엔드포인트를 도입하는 경우 백엔드 보안 정책에 따라 SameSite 또는 CSRF 보호를 적용한다.

```txt
Authorization: Bearer {accessToken}
```

### 응답 공통 포맷

```json
{
  "success": true,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

```json
{
  "success": false,
  "status": 400,
  "message": "요청을 처리할 수 없습니다.",
  "data": null
}
```

### 공통 Enum

| Enum | Values |
|------|--------|
| `MemberType` | `USER`, `COMPANY` |
| `MemberStatus` | `ACTIVE`, `SUSPENDED`, `BANNED`, `LOCKED`, `WITHDRAWN`, `BLACKLISTED` |
| `CompanyApprovalStatus` | `NONE`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION` |
| `VerificationChannel` | `EMAIL`, `PHONE` |
| `VerificationStatus` | `SENT`, `VERIFIED`, `CONSUMED`, `EXPIRED`, `FAILED`, `RATE_LIMITED` |

### 공통 Error Cases

| status | 상황 | 프론트 처리 |
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

- **Endpoint**: `POST /api/v1/user/members/login`
- **Content-Type**: `application/json`

### Request

```json
{
  "loginId": "career_user01",
  "password": "Password123!",
  "roleType": "USER"
}
```

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `loginId` | `string` | Y | 로그인 아이디 |
| `password` | `string` | Y | 비밀번호 |
| `roleType` | `MemberType` | Y | 개인/기업 로그인 탭 값 |

### Response `200 OK`

```json
{
  "success": true,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "jwt-access-token",
    "member": {
      "memberId": "uuid-v4",
      "loginId": "career_user01",
      "name": "홍길동",
      "roleType": "USER",
      "memberStatus": "ACTIVE",
      "companyApprovalStatus": "NONE",
      "lastLoginAt": "2026-05-31T12:30:00Z"
    }
  }
}
```

### Error Cases

| status | 상황 |
|------------|------|
| `401` | 아이디 또는 비밀번호 불일치 |
| `403` | 승인 대기 기업회원 또는 제재 계정 |
| `423` | 반복 실패로 잠긴 계정 |
| `429` | 로그인 시도 횟수 초과 |

---

## 2. 아이디 중복 확인

- **Endpoint**: `GET /api/v1/user/members/login-id/check?loginId={loginId}`

### Response

```json
{
  "success": true,
  "message": "사용 가능한 아이디입니다.",
  "data": {
    "available": true
  }
}
```

---

## 3. 인증번호 발송

- **Endpoint**: `POST /api/v1/user/members/verifications/send`

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

- **Endpoint**: `POST /api/v1/user/members/verifications/confirm`

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

- **Endpoint**: `POST /api/v1/user/members/register/user`

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
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "roleType": "USER",
    "memberStatus": "ACTIVE"
  }
}
```

---

## 6. 기업회원 가입

- **Endpoint**: `POST /api/v1/user/members/register/company`
- **Content-Type**: `application/json`

> 재직증명서 PDF는 먼저 `POST /api/v1/user/members/company/employment-certificate`로 업로드하고, 기업회원 가입 요청에는 서버가 반환한 `employmentCertificateFileId`만 포함한다.  
> 가입 정보 저장과 파일 업로드 실패를 분리하여 재시도/진행률/오류 메시지를 명확히 처리하기 위함이다.

### Request

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
  "managerPhoneVerificationToken": "short-lived-token",
  "managerEmailVerificationToken": "short-lived-token",
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
  "message": "기업회원 가입 신청이 완료되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "companyProfileId": "uuid-v4",
    "roleType": "COMPANY",
    "memberStatus": "ACTIVE",
    "companyApprovalStatus": "PENDING_REVIEW"
  }
}
```

---

## 7. 재직증명서 PDF 업로드

- **Endpoint**: `POST /api/v1/user/members/company/employment-certificate`
- **Content-Type**: `multipart/form-data`

### Request

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `file` | `File` | Y | PDF, max 5MB |

> FR-007 기준으로 프론트는 확장자, MIME 타입(`application/pdf`), 파일 크기(5MB 이하)를 1차 검증한다. 서버는 동일 조건을 2차 검증하고 악성 파일 또는 위장 파일을 차단한다.

### Response

```json
{
  "success": true,
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

### Error Cases

| status | 상황 |
|------------|------|
| `400` | PDF 형식 아님 / MIME 불일치 / 5MB 초과 |
| `401` | 인증 필요 또는 토큰 만료 |
| `413` | 서버 허용 용량 초과 |
| `415` | 지원하지 않는 파일 형식 |
| `500` | 파일 저장소 또는 악성 파일 검사 실패 |

---

## 8. 아이디 찾기

- **Endpoint**: `POST /api/v1/user/members/recovery/find-id`

### Request

```json
{
  "roleType": "USER",
  "verificationToken": "short-lived-token"
}
```

기업회원은 추가 식별값을 포함한다.

```json
{
  "roleType": "COMPANY",
  "managerName": "김담당",
  "businessNumber": "1234567890",
  "verificationToken": "short-lived-token"
}
```

### Response

```json
{
  "success": true,
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

- **Endpoint**: `POST /api/v1/user/members/recovery/password-token`

### Request

```json
{
  "roleType": "USER",
  "loginId": "career_user01",
  "verificationToken": "short-lived-token"
}
```

기업회원은 추가 식별값을 포함한다.

```json
{
  "roleType": "COMPANY",
  "loginId": "company_hr01",
  "managerName": "김담당",
  "businessNumber": "1234567890",
  "verificationToken": "short-lived-token"
}
```

### Response

```json
{
  "success": true,
  "message": "비밀번호를 재설정할 수 있습니다.",
  "data": {
    "resetToken": "password-reset-token",
    "expiresAt": "2026-05-31T12:40:00Z"
  }
}
```

---

## 10. 비밀번호 재설정

- **Endpoint**: `POST /api/v1/user/members/recovery/reset-password`

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
  "message": "비밀번호가 변경되었습니다.",
  "data": {
    "changedAt": "2026-05-31T12:39:00Z"
  }
}
```

---

## 11. 토큰 갱신

- **Endpoint**: `POST /api/v1/user/members/token/refresh`
- **인증**: 불필요 (refresh token으로 처리)

### Request

refresh token은 HttpOnly cookie 우선, 불가 시 body로 전달한다.

```json
{
  "refreshToken": "refresh-token-value"
}
```

### Response `200 OK`

```json
{
  "success": true,
  "message": "토큰이 갱신되었습니다.",
  "data": {
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-refresh-token-value"
  }
}
```

### Error Cases

| status | 상황 |
|------------|------|
| `401` | refresh token 만료 또는 유효하지 않음 |

---

## 12. 내 회원 상태 조회

- **Endpoint**: `GET /api/v1/user/members/me/status`
- **인증**: 필요

### Response

```json
{
  "success": true,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "roleType": "COMPANY",
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
  "messageCode": "ACCOUNT_RESTRICTED",
  "reason": "커뮤니티 운영정책 위반",
  "startedAt": "2026-05-31T00:00:00Z",
  "duration": "SEVEN_DAYS"
}
```
