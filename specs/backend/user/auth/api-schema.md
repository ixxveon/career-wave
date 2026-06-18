# API Schema: 사용자 인증 기능 (Backend)

> 백엔드와 프론트엔드 간 사용자 인증 API 계약 문서.
> 프론트 타입 기준: `frontend/src/types/user/member.ts`
> Base path: `/api/v1/user/members`

---

## 1. 공통 규칙

### 1.1 응답 형식

모든 API는 `ApiResponse<T>`를 사용한다.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

실패 응답도 동일한 wrapper를 사용한다.

```json
{
  "success": false,
  "statusCode": 400,
  "message": "요청을 처리할 수 없습니다.",
  "data": null
}
```

### 1.2 인증 규칙

- 인증 필요 API는 `Authorization: Bearer {accessToken}` 헤더를 사용한다.
- access token은 response body의 `data.accessToken`으로 반환한다.
- refresh token은 HttpOnly Cookie로만 전달한다.
- refresh token은 request body 또는 response body에 포함하지 않는다.
- token refresh는 `credentials: include`로 cookie를 전달하는 흐름을 전제로 한다.

```http
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/user/members
```

### 1.3 Public API

아래 API는 인증 없이 접근한다.

```text
POST /login
POST /token/refresh
GET  /login-id/check
POST /verifications/send
POST /verifications/confirm
POST /register/user
POST /register/company
POST /company/employment-certificate
GET  /oauth/{provider}/authorize
GET  /oauth/{provider}/callback
POST /register/social/complete
POST /recovery/find-id
POST /recovery/password-token
POST /recovery/reset-password
```

### 1.4 Protected API

아래 API는 access token 인증이 필요하다.

```text
POST /logout
GET  /me/status
```

### 1.5 ERD 기준

- `members`: 회원 마스터
- `personal_profiles`: 개인회원 프로필, 개인회원 가입 시 빈 row 생성
- `company_profiles`: 기업회원 프로필 및 재직증명서 최종 저장 컬럼
- `member_verifications`: 이메일/휴대폰 인증번호 및 `verificationToken`
- `password_reset_tokens`: 비밀번호 재설정 resetToken hash
- `member_terms_agreements`: 회원가입 약관 동의
- `hr_managers`: 기업회원 HR 승인 상태
- `social_accounts`: 소셜 provider 계정 연결 정보

#### ERD Alignment Rules

- `members.role_type`은 DB/API/JWT에서 `USER`, `COMPANY`를 사용한다.
- Spring Security authority가 필요할 때만 backend security layer에서 `ROLE_USER`, `ROLE_COMPANY`로 변환한다.
- `members.phone`은 unique로 관리하되 null은 허용한다.
- `members.member_status`는 `ACTIVE`, `SUSPENDED`, `BANNED`, `LOCKED`, `WITHDRAWN`, `BLACKLISTED`를 사용한다.
- `hr_managers.hr_status`는 `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED`를 사용한다.
- `company_profiles`에는 승인 상태 컬럼을 두지 않는다.
- `companyApprovalStatus=NONE`은 DB 저장값이 아니라 API 응답 전용 가상값이다.
- `roleType=USER`인 회원은 `hr_managers` row가 없으므로 `companyApprovalStatus=NONE`을 반환한다.
- `roleType=COMPANY`인 회원은 기본적으로 `hr_managers.hr_status`를 `companyApprovalStatus`로 반환한다.
- 단, `hr_managers.hr_status=REMOVED`는 승인 이후 HR 연결 제거를 의미하는 내부 상태값이므로 현재 public/user API 응답에서는 `companyApprovalStatus=NONE`으로 변환한다.
- `REMOVED` 상태의 기업회원은 로그인 시 403으로 차단하며 access token/refresh token을 발급하지 않는다.
- 개인회원 가입 성공 시 `personal_profiles` 빈 row를 생성한다.

#### `social_accounts` Table

| Column | Type | Constraint | Description |
|---|---|---|---|
| `social_account_id` | UUID | PK | 소셜 계정 연결 ID |
| `member_id` | UUID | FK, NOT NULL, ON DELETE CASCADE | 연결된 회원 |
| `provider` | VARCHAR(20) | NOT NULL, CHECK | `KAKAO`, `NAVER`, `GOOGLE` |
| `provider_user_id` | VARCHAR(255) | NOT NULL | provider의 고유 사용자 ID |
| `provider_email` | VARCHAR(255) | nullable | provider에서 받은 이메일 |
| `linked_at` | TIMESTAMP | NOT NULL | 연결 시각 |
| `created_at` | TIMESTAMP | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMP | NOT NULL | 수정 시각 |

- `UNIQUE (provider, provider_user_id)`로 같은 provider 계정 중복 연결을 막는다.
- `UNIQUE (member_id, provider)`로 한 회원이 같은 provider를 중복 연결하지 못하게 한다.
- OAuth callback에서 받은 provider 사용자 정보는 이 테이블을 기준으로 기존 회원과 연결한다.

---

## 2. Enum 계약

| Enum | Values |
|---|---|
| `MemberType` | `USER`, `COMPANY` |
| `MemberStatus` | `ACTIVE`, `SUSPENDED`, `BANNED`, `LOCKED`, `WITHDRAWN`, `BLACKLISTED` |
| `CompanyApprovalStatus` | `NONE`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION` |
| `VerificationChannel` | `EMAIL`, `PHONE` |
| `VerificationPurpose` | `REGISTER`, `FIND_ID`, `RESET_PASSWORD` |
| `VerificationStatus` | `SENT`, `VERIFIED`, `CONSUMED`, `EXPIRED`, `FAILED`, `RATE_LIMITED` |
| `CompanyType` | `ENTERPRISE`, `SUBSIDIARY`, `SME`, `MID_MARKET`, `VENTURE`, `FOREIGN_INVESTED`, `FOREIGN_CORPORATION`, `PUBLIC`, `NON_PROFIT`, `FOREIGN_NON_PROFIT` |

> `BANNED`는 서비스 이용 정지 상태, `BLACKLISTED`는 재가입 또는 주요 서비스 접근 차단 대상 상태로 구분한다.

---

## 3. 로그인

### POST `/api/v1/user/members/login`

- **Auth**: Public
- **Content-Type**: `application/json`

#### Request

```json
{
  "loginId": "career_user01",
  "password": "Password123!",
  "roleType": "USER"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `loginId` | string | Y | 로그인 아이디 |
| `password` | string | Y | 비밀번호 |
| `roleType` | `USER` \| `COMPANY` | Y | 로그인 탭의 회원 유형 |

#### Response `200 OK`

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
      "roleType": "USER",
      "memberStatus": "ACTIVE",
      "subscriptionStatus": "FREE",
      "companyApprovalStatus": "NONE",
      "lastLoginAt": "2026-05-31T12:30:00Z"
    }
  }
}
```

#### Response Header

```http
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/user/members
```

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 401 | `AUTH_INVALID_CREDENTIALS` | 아이디/비밀번호 불일치 또는 roleType 불일치 |
| 403 | `AUTH_ACCOUNT_SUSPENDED` | 정지 계정 |
| 403 | `AUTH_ACCOUNT_BANNED` | 차단 계정 |
| 403 | `AUTH_ACCOUNT_BLACKLISTED` | 블랙리스트 계정 |
| 403 | `AUTH_ACCOUNT_WITHDRAWN` | 탈퇴 계정 |
| 403 | `AUTH_COMPANY_PENDING_REVIEW` | 기업회원 승인 대기, token 미발급 |
| 403 | `AUTH_COMPANY_REJECTED` | 기업회원 승인 반려, token 미발급 |
| 403 | `AUTH_COMPANY_NEEDS_REVISION` | 기업회원 보완 요청, token 미발급 |
| 423 | `AUTH_ACCOUNT_LOCKED` | 로그인 실패 누적 잠금 |

---

## 4. 토큰 재발급

### POST `/api/v1/user/members/token/refresh`

- **Auth**: Public
- **Request Body**: 없음
- **Cookie**: `refreshToken`

#### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "토큰이 갱신되었습니다.",
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

#### Notes

- refresh token은 request body로 받지 않는다.
- refresh token은 response body로 반환하지 않는다.
- rotation 성공 시 새 refresh token은 `Set-Cookie`로 재발급된다.

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 401 | `AUTH_REFRESH_INVALID` | refresh cookie 없음/만료/위조/폐기 |
| 403 | `AUTH_ACCOUNT_SUSPENDED` | refresh 시점 계정 제한 |

---

## 5. 로그아웃

### POST `/api/v1/user/members/logout`

- **Auth**: Required

#### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그아웃 되었습니다.",
  "data": null
}
```

#### Response Header

```http
Set-Cookie: refreshToken=; Path=/api/v1/user/members; Max-Age=0; HttpOnly; Secure; SameSite=Strict
```

---

## 6. 내 회원 상태 조회

### GET `/api/v1/user/members/me/status`

- **Auth**: Required

#### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
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

---

## 7. 로그인 아이디 중복 확인

### GET `/api/v1/user/members/login-id/check?loginId={loginId}`

- **Auth**: Public

#### Response `200 OK`

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

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `LOGIN_ID_INVALID` | 아이디 형식 오류 |

> 중복 여부는 200 응답의 `available=false`로 반환할 수 있다. 최종 가입 시점에는 중복을 다시 검증한다.

---

## 8. 인증번호 발송

### POST `/api/v1/user/members/verifications/send`

- **Auth**: Public

#### Request

```json
{
  "channel": "EMAIL",
  "target": "user@example.com",
  "purpose": "REGISTER"
}
```

#### Response `200 OK`

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

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `VERIFICATION_TARGET_INVALID` | 이메일/휴대폰 형식 오류 |
| 429 | `VERIFICATION_RATE_LIMITED` | 재발송 또는 시도 제한 |

#### Verification Storage Notes

- 인증번호/인증 상태/`verificationToken`은 `member_verifications` 테이블에 저장한다.
- `verificationId`는 `member_verifications.verification_id`를 사용한다.
- 인증번호 TTL은 `member_verifications.expires_at` 기준 5분이다.
- 인증번호 원문은 저장하지 않고 `member_verifications.code_hash`만 저장한다.
- 인증 완료 후 발급한 `verificationToken`은 `member_verifications.verification_token`에 저장한다.
- 이메일 발송 provider는 `AWS SES`, SMS 발송 provider는 `SOLAPI / CoolSMS`를 사용한다.
- 외부 API Key/Secret은 환경변수 기반으로만 주입한다.

---

## 9. 인증번호 확인

### POST `/api/v1/user/members/verifications/confirm`

- **Auth**: Public

#### Request

```json
{
  "verificationId": "uuid-v4",
  "code": "123456"
}
```

#### Response `200 OK`

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

#### Notes

- `verificationToken`은 회원가입/아이디 찾기/비밀번호 재설정 요청 시 서버 검증용으로 사용한다.
- 프론트의 인증 완료 boolean은 신뢰하지 않는다.
- `verificationToken`은 `member_verifications.verification_token` 기준으로 검증한다.

---

## 10. 개인회원 가입

### POST `/api/v1/user/members/register/user`

- **Auth**: Public

#### Request

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

#### Terms Notes

- 프론트의 `age` 동의는 화면 제출 전 필수 UX validation으로 처리한다.
- 백엔드 API request에는 `age`를 포함하지 않는다.
- 백엔드는 개인회원 가입 시 `terms.service=true`, `terms.privacy=true`를 필수로 검증한다.
- `terms.marketing`은 선택 약관이며 미전달 시 `false`로 저장한다.
- 제출된 약관 동의값은 `member_terms_agreements`에 저장한다.
- 개인회원은 기업 전용 약관 컬럼을 사용하지 않으므로 `company_verification_agreed=null`, `sms_agreed=null`로 저장한다.

#### Side Effects

- 개인회원 가입 성공 시 `members.role_type=USER`, `members.member_status=ACTIVE`, `members.subscription_status=FREE`, `members.warning_count=0`으로 생성한다.
- 개인회원 가입 성공 시 `personal_profiles`에 빈 profile row를 함께 생성한다.

#### Response `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "회원가입이 완료되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "roleType": "USER",
    "memberStatus": "ACTIVE"
  }
}
```

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `PASSWORD_POLICY_VIOLATION` | 비밀번호 정책 위반 |
| 400 | `VERIFICATION_TOKEN_INVALID` | 인증 token 없음/만료/purpose 불일치 |
| 400 | `REGISTER_TERMS_REQUIRED` | 필수 약관 미동의 |
| 409 | `LOGIN_ID_ALREADY_EXISTS` | 아이디 중복 |
| 409 | `EMAIL_ALREADY_EXISTS` | 이메일 중복 |
| 409 | `PHONE_ALREADY_EXISTS` | 휴대폰 번호 중복 |

---

## 11. 기업회원 가입

### POST `/api/v1/user/members/register/company`

- **Auth**: Public

#### Request

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
  "certificateNumber": "202606150001",
  "postalCode": "06134",
  "roadAddress": "서울특별시 강남구 테헤란로 123",
  "jibunAddress": "서울특별시 강남구 역삼동 123-45",
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
    "sms": true,
    "marketing": false
  }
}
```

#### Terms Notes

- 백엔드는 기업회원 가입 시 `terms.service=true`, `terms.privacy=true`, `terms.companyVerification=true`, `terms.sms=true`를 필수로 검증한다.
- `terms.marketing`은 선택 약관이며 기본값은 `false`다.
- 제출된 약관 동의값은 `member_terms_agreements`에 저장한다.
- `service_agreed`, `privacy_agreed`, `company_verification_agreed`, `sms_agreed`는 기업회원 필수 동의다.
- `marketing_agreed`는 선택 동의이며 미전달 시 `false`로 저장한다.
- 기업회원은 `company_verification_agreed=true`, `sms_agreed=true`가 아니면 가입 신청을 생성하지 않는다.

#### Company Verification Policy

- `businessNumber`는 숫자 10자리로 정규화한다.
- `companyName`, `ceoName`, `certificateNumber`는 공백 제거 후 필수 검증한다.
- 사업자등록정보 검증은 외부 API adapter를 통해 처리한다.
- 사용 API는 공공데이터포털 `국세청 사업자등록정보 상태조회(status)` API다.
- 이번 단계에서는 `businessNumber`만으로 status API를 호출한다.
- `start_dt`, `p_nm`, `ceoName`, `certificateNumber`를 status API 검증 파라미터로 사용하지 않는다.
- `certificateNumber`는 프론트 `CompanyRegisterRequest` 타입과 payload mapping에 포함되어 있다.
- 외부 API 검증 실패 시 `COMPANY_BUSINESS_VERIFICATION_FAILED`를 반환한다.
- 외부 API 장애/타임아웃은 `COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE`을 반환하거나 admin 수동 검증 대상으로 접수하는 정책 중 하나로 확정한다.

#### Address Policy

- 주소 검색은 이번 기업회원 가입 범위에 포함한다.
- 프론트는 주소 검색 버튼을 활성화하고 행정안전부 도로명주소 API 또는 동등한 한국 주소 API를 호출한다.
- 프론트는 Kakao(Daum) 우편번호 서비스로 주소를 검색하며, 선택 결과에서 `postalCode`, `roadAddress`, `jibunAddress`를 자동 입력한다.
- `addressDetail`은 사용자가 직접 입력한다.
- 백엔드는 `postalCode`, `roadAddress`를 필수 문자열로 검증한다. `addressDetail`, `jibunAddress`는 선택값이다.
- 직접 입력만으로 생성된 주소는 허용하지 않는다.
- 백엔드 INSERT 시 `address` 컬럼(DB NOT NULL)은 `roadAddress` 값으로 채운다.

#### Response `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "기업회원 가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다.",
  "data": {
    "memberId": "uuid-v4",
    "companyProfileId": "uuid-v4",
    "roleType": "COMPANY",
    "memberStatus": "ACTIVE",
    "companyApprovalStatus": "PENDING_REVIEW"
  }
}
```

#### File Lifecycle

- 업로드 성공 시 반환되는 `fileId`는 가입 전 임시 식별자다.
- 기업회원 가입 성공 시 `company_profiles.cert_file_url`, `company_profiles.cert_file_name`에 최종 반영한다.
- `company_profiles.certificate_number`, `cert_file_url`, `cert_file_name`은 기업회원 가입 성공 시 필수 저장값이다.
- 기업회원 가입에 사용되지 않은 fileId는 24시간 후 정리 대상이다.

#### Approval Policy

- 기업회원 가입 API는 신청 접수만 처리하며 access token/refresh token을 발급하지 않는다.
- 가입 직후 `hr_managers.hr_status=PENDING_REVIEW` 상태로 생성한다.
- 기업회원 응답의 `companyApprovalStatus`는 `hr_managers.hr_status`를 기준으로 반환한다.
- 개인회원 응답의 `companyApprovalStatus=NONE`은 DB 저장값이 아니라 응답 전용 가상값이다.
- admin이 HR 담당자 소속을 확인하고 승인하면 `hr_managers.hr_status=APPROVED`로 변경한다.
- admin이 반려하면 `hr_managers.hr_status=REJECTED`로 변경하고 `reject_reason`을 저장한다.
- admin이 보완 요청하면 `hr_managers.hr_status=NEEDS_REVISION`으로 변경하고 보완 사유를 저장한다.
- 승인 이후 HR 담당자 연결이 제거되면 `hr_managers.hr_status=REMOVED`로 변경한다.
- `REMOVED`는 내부 상태로 유지하되, 현재 user API 응답의 `companyApprovalStatus`에는 직접 노출하지 않고 `NONE`으로 변환한다.
- 승인/반려 결과 이메일 발송은 admin 승인/반려 service의 책임이다.
- `APPROVED`가 아닌 기업회원 로그인 요청은 403으로 실패하며 token을 발급하지 않는다.

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `COMPANY_TYPE_INVALID` | 기업 형태 오류 |
| 400 | `COMPANY_BUSINESS_VERIFICATION_FAILED` | 사업자등록정보 상태조회 실패 또는 유효하지 않은 사업자 |
| 503 | `COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE` | 외부 사업자 검증 API 장애/타임아웃 |
| 400 | `VERIFICATION_TOKEN_INVALID` | 담당자 인증 token 오류 |
| 400 | `EMPLOYMENT_FILE_INVALID` | 재직증명서 fileId 오류 |
| 409 | `LOGIN_ID_ALREADY_EXISTS` | 아이디 중복 |
| 409 | `BUSINESS_NUMBER_ALREADY_EXISTS` | 사업자등록번호 중복 |

---

## 12. 재직증명서 PDF 업로드

### POST `/api/v1/user/members/company/employment-certificate`

- **Auth**: Public
- **Content-Type**: `multipart/form-data`

#### Request

| Field | Type | Required | Constraint |
|---|---|---|---|
| `file` | File | Y | PDF, max 5MB |

#### Response `200 OK`

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

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `EMPLOYMENT_FILE_INVALID` | PDF 형식 아님 또는 MIME 불일치 |
| 413 | `EMPLOYMENT_FILE_TOO_LARGE` | 5MB 초과 |
| 415 | `EMPLOYMENT_FILE_UNSUPPORTED` | 지원하지 않는 파일 형식 |

---

## 13. 소셜 OAuth 로그인/회원가입

### GET `/api/v1/user/members/oauth/{provider}/authorize`

- **Auth**: Public
- **Path Variable**: `provider = kakao | naver | google`
- **Description**: provider 인증 URL을 생성한다.
- **Scope**: Apple 로그인은 지원하지 않는다.

#### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "소셜 인증 URL이 생성되었습니다.",
  "data": {
    "provider": "kakao",
    "authorizationUrl": "https://kauth.kakao.com/oauth/authorize?...",
    "state": "opaque-state"
  }
}
```

> 구현 방식은 response body 반환 또는 302 redirect 중 하나로 확정한다. SPA 프론트 제어가 필요하면 body 반환을 우선한다.

### GET `/api/v1/user/members/oauth/{provider}/callback`

- **Auth**: Public
- **Query**: `code`, `state`
- **Description**: provider code를 검증하고 기존 소셜 계정 로그인 또는 최초 가입 추가정보 입력으로 분기한다.

#### Response - 기존 소셜 계정 `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "jwt-access-token",
    "member": {
      "memberId": "uuid-v4",
      "loginId": "social_user01",
      "name": "홍길동",
      "roleType": "USER",
      "memberStatus": "ACTIVE",
      "subscriptionStatus": "FREE",
      "companyApprovalStatus": "NONE",
      "lastLoginAt": "2026-06-15T10:00:00Z"
    },
    "nextPath": "/user/dashboard"
  }
}
```

#### Response - 최초 소셜 가입 필요 `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "추가정보 입력이 필요합니다.",
  "data": {
    "provider": "kakao",
    "socialEmail": "social@example.com",
    "socialSignupToken": "short-lived-token",
    "nextPath": "/register/social/complete"
  }
}
```

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `OAUTH_PROVIDER_INVALID` | 지원하지 않는 provider |
| 400 | `OAUTH_STATE_INVALID` | state 불일치 또는 만료 |
| 401 | `OAUTH_PROVIDER_AUTH_FAILED` | provider code/token 검증 실패 |
| 409 | `SOCIAL_EMAIL_ALREADY_EXISTS` | 기존 일반 계정 이메일과 충돌, 별도 연결 정책 필요 |

> OAuth 로그인은 `social_accounts(provider, provider_user_id, member_id)` 저장 구조를 기준으로 기존 회원 연결 여부를 판단한다.
> 최초 소셜 가입용 `socialSignupToken`은 Redis `user-auth:social-signup:{tokenHash}`에 저장한다.
> raw token은 저장하지 않고 hash만 key에 사용하며, TTL은 10분이다.
> `/register/social/complete` 성공 시 Redis key를 삭제해 1회 사용을 보장한다.
> 회원 식별 기준은 email이 아니라 `provider + providerUserId` 조합이며 `provider_email`은 nullable이다.

### POST `/api/v1/user/members/register/social/complete`

- **Auth**: Public
- **Description**: OAuth provider 인증은 완료되었지만 아직 회원이 아닌 사용자의 추가정보를 저장한다.

#### Request

```json
{
  "provider": "kakao",
  "socialSignupToken": "short-lived-token",
  "socialEmail": "social@example.com",
  "name": "홍길동",
  "carrier": "SKT",
  "phone": "01012345678",
  "phoneVerificationToken": "short-lived-token",
  "terms": {
    "service": true,
    "privacy": true,
    "marketing": false
  }
}
```

#### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "소셜 회원가입이 완료되었습니다.",
  "data": {
    "memberId": "uuid-v4",
    "roleType": "USER",
    "memberStatus": "ACTIVE",
    "nextPath": "/auth/login?registered=social"
  }
}
```

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `SOCIAL_SIGNUP_TOKEN_INVALID` | socialSignupToken 만료/오류 |
| 400 | `VERIFICATION_TOKEN_INVALID` | 휴대폰 인증 token 오류 |
| 409 | `PHONE_ALREADY_EXISTS` | 휴대폰 번호 중복 |
| 409 | `SOCIAL_ACCOUNT_ALREADY_LINKED` | 이미 연결된 소셜 계정 |

> 현재 프론트 타입에는 `socialSignupToken` 필드가 없으므로 실제 연동 전 타입 업데이트가 필요하다.

---

## 14. 아이디 찾기

### POST `/api/v1/user/members/recovery/find-id`

- **Auth**: Public

#### Request - 개인회원

```json
{
  "roleType": "USER",
  "verificationToken": "short-lived-token"
}
```

#### Request - 기업회원

```json
{
  "roleType": "COMPANY",
  "managerName": "김담당",
  "businessNumber": "1234567890",
  "verificationToken": "short-lived-token"
}
```

#### Response `200 OK`

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

#### Notes

- 결과가 없어도 동일한 일반 메시지를 사용한다.
- `found=false`일 때 `maskedLoginIds`는 빈 배열이다.

---

## 15. 비밀번호 재설정 권한 발급

### POST `/api/v1/user/members/recovery/password-token`

- **Auth**: Public

#### Request - 개인회원

```json
{
  "roleType": "USER",
  "loginId": "career_user01",
  "verificationToken": "short-lived-token"
}
```

#### Request - 기업회원

```json
{
  "roleType": "COMPANY",
  "loginId": "company_hr01",
  "managerName": "김담당",
  "businessNumber": "1234567890",
  "verificationToken": "short-lived-token"
}
```

#### Response `200 OK`

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

## 16. 비밀번호 재설정

### POST `/api/v1/user/members/recovery/reset-password`

- **Auth**: Public

#### Request

```json
{
  "resetToken": "password-reset-token",
  "newPassword": "NewPassword123!"
}
```

#### Response `200 OK`

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

#### Side Effects

- 비밀번호 변경 성공 시 해당 member의 모든 refresh token을 폐기한다.
- 사용자는 모든 기기에서 재로그인이 필요하다.

#### Error Cases

| HTTP | ErrorCode | 상황 |
|---|---|---|
| 400 | `PASSWORD_RESET_TOKEN_INVALID` | resetToken 없음/위조/재사용 |
| 400 | `PASSWORD_RESET_TOKEN_EXPIRED` | resetToken 만료 |
| 400 | `PASSWORD_POLICY_VIOLATION` | 새 비밀번호 정책 위반 |

---

## 17. ErrorCode 매핑

| ErrorCode | HTTP | Description |
|---|---|---|
| `LOGIN_ID_INVALID` | 400 | loginId 형식 오류 |
| `LOGIN_ID_ALREADY_EXISTS` | 409 | loginId 중복 |
| `EMAIL_ALREADY_EXISTS` | 409 | email 중복 |
| `PHONE_ALREADY_EXISTS` | 409 | phone 중복 |
| `BUSINESS_NUMBER_ALREADY_EXISTS` | 409 | 사업자등록번호 중복 |
| `COMPANY_TYPE_INVALID` | 400 | 기업 형태 오류 |
| `COMPANY_BUSINESS_VERIFICATION_FAILED` | 400 | 사업자등록정보 진위확인 실패 |
| `COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE` | 503 | 외부 사업자 검증 API 장애/타임아웃 |
| `REGISTER_TERMS_REQUIRED` | 400 | 필수 약관 미동의 |
| `PASSWORD_POLICY_VIOLATION` | 400 | 비밀번호 정책 위반 |
| `VERIFICATION_TARGET_INVALID` | 400 | 인증 대상 형식 오류 |
| `INVALID_VERIFICATION_CODE` | 400 | 인증번호 불일치 |
| `VERIFICATION_EXPIRED` | 400 | 인증번호 만료 |
| `VERIFICATION_RATE_LIMITED` | 429 | 인증번호 발송/확인 제한 |
| `VERIFICATION_TOKEN_INVALID` | 400 | verificationToken 없음/위조/purpose 불일치 |
| `PASSWORD_RESET_TOKEN_INVALID` | 400 | resetToken 없음/위조/재사용 |
| `PASSWORD_RESET_TOKEN_EXPIRED` | 400 | resetToken 만료 |
| `EMPLOYMENT_FILE_INVALID` | 400 | 파일 검증 실패 |
| `EMPLOYMENT_FILE_TOO_LARGE` | 413 | 파일 크기 초과 |
| `EMPLOYMENT_FILE_UNSUPPORTED` | 415 | 파일 형식 미지원 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 로그인 실패 공통 메시지 |
| `AUTH_ACCOUNT_LOCKED` | 423 | 계정 잠금 |
| `AUTH_ACCOUNT_BLACKLISTED` | 403 | 블랙리스트 계정 |
| `AUTH_COMPANY_PENDING_REVIEW` | 403 | 기업회원 승인 대기 |
| `AUTH_COMPANY_REJECTED` | 403 | 기업회원 승인 반려 |
| `AUTH_COMPANY_NEEDS_REVISION` | 403 | 기업회원 보완 요청 |
| `OAUTH_PROVIDER_INVALID` | 400 | 지원하지 않는 소셜 provider |
| `OAUTH_STATE_INVALID` | 400 | OAuth state 불일치/만료 |
| `OAUTH_PROVIDER_AUTH_FAILED` | 401 | provider 인증 실패 |
| `SOCIAL_SIGNUP_TOKEN_INVALID` | 400 | socialSignupToken 없음/위조/만료 |
| `SOCIAL_EMAIL_ALREADY_EXISTS` | 409 | 기존 이메일과 소셜 이메일 충돌 |
| `SOCIAL_ACCOUNT_ALREADY_LINKED` | 409 | 이미 연결된 소셜 계정 |

---

## 18. Rate Limit 정책

| API | 기준 | 정책 |
|---|---|---|
| `POST /verifications/send` | `target + purpose` | 60초 재발송 제한, 1시간 5회 |
| `POST /verifications/confirm` | `verificationId` | 최대 5회 실패 허용 |
| `POST /login` | `roleType + loginId` | 기존 `LoginAttemptStore` 정책, 5회 실패 시 15분 LOCKED |
| `POST /recovery/password-token` | `loginId + IP` | 10분 5회 |
| `POST /recovery/reset-password` | `resetToken` | 5회 실패 또는 만료 시 재인증 필요 |

---

## 19. Frontend Mock 차이

| 항목 | 현재 mock | 실제 backend spec |
|---|---|---|
| refresh cookie 이름 | `mock-session` | `refreshToken` |
| refresh response | `accessToken`, `refreshToken` | `accessToken` only |
| 회원가입 mock | 없음 또는 미완성 | 본 문서 계약 기준 |
| 아이디/비밀번호 찾기 mock | 없음 또는 미완성 | 본 문서 계약 기준 |
