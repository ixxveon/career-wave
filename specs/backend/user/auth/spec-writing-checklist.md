# User Auth Backend Spec Writing Checklist

> 목적: `회원가입 / 로그인 / 아이디 찾기 / 비밀번호 찾기` 백엔드 spec 작성 전후에 사용하는 자체 점검 문서.
> 기준 문서: `docs/CONVENTION.md`, `specs/backend/auth/*`, `specs/frontend/user/member/*`, `frontend/src/api/user/member/*`, `frontend/src/types/user/member.ts`

---

## 0. 작성 대상 파일 확인

- [x] 아래 5개 문서를 `specs/backend/user/auth/` 하위에 작성한다.

```text
specs/backend/user/auth/
├── spec.md
├── plan.md
├── tasks.md
├── api-schema.md
└── checklist.md
```

- [x] 기존 `specs/backend/auth/`와 역할을 분리한다.
  - `specs/backend/auth/`: JWT 공통 인증, refresh/logout/blacklist, admin auth
  - `specs/backend/user/auth/`: 사용자 회원가입, 로그인, 아이디 찾기, 비밀번호 찾기
- [x] 프론트 계약은 `specs/frontend/user/member/`와 `frontend/src/types/user/member.ts`를 기준으로 확인한다.
- [x] MSW mock은 임시 응답이므로 최종 계약의 원본으로 삼지 않는다.

---

## 1. Spec Driven Development 원칙

- [x] 구현보다 spec 문서가 우선이라는 원칙을 문서에 반영한다.
- [x] spec과 convention이 충돌하는 경우, 구현 전에 spec 또는 convention 변경 필요성을 명시한다.
- [x] 존재하지 않는 클래스, 패키지, API를 추측해서 작성하지 않는다.
- [x] 기존 코드 패턴과 다른 설계가 필요한 경우 `plan.md` 또는 `constitution 성격의 규칙`에 근거를 남긴다.
- [x] 신규 라이브러리 또는 외부 연동이 필요한 경우 팀 합의 필요 여부를 명시한다.

---

## 2. Backend Package / Architecture 점검

- [x] 사용자 인증 기능의 코드 위치를 `user/member` 또는 `user/auth` 중 하나로 명확히 정한다.
  - 기존 코드 기준: `backend/src/main/java/kr/co/carrer/user/member/`
  - 새 spec 디렉토리 기준: `specs/backend/user/auth/`
- [x] 실제 구현 패키지는 기존 코드와 충돌하지 않도록 정한다.
- [x] 패키지 구조는 아래 convention을 따른다.

```text
backend/src/main/java/kr/co/carrer/user/{domain}/
├── entity
├── repository
├── type
├── exception
├── service
├── service/impl
├── controller
├── dto
└── docs
```

- [x] `global`은 `user` 도메인 코드를 참조하지 않도록 설계한다.
- [x] `user`와 `admin` 패키지는 서로 직접 참조하지 않도록 작성한다.
- [x] 공통 인증/JWT 로직은 이미 존재하는 `auth` 또는 `global` 계층을 재사용한다.
- [x] Controller에는 비즈니스 로직을 넣지 않고 Service에 위임한다.
- [x] Service는 인터페이스와 구현체를 분리한다.

```text
service/UserAuthService.java
service/impl/UserAuthServiceImpl.java
```

- [x] Controller는 구현체가 아니라 인터페이스 타입으로 주입받는다고 명시한다.

---

## 3. Phase 구성 점검

- [x] `plan.md`의 Phase는 사용자가 선호한 레이어 기반 흐름으로 작성한다.

```text
Phase 1: Entity / Enum / DB 구조 정리
Phase 2: Repository 구현
Phase 3: DTO / Validation 구현
Phase 4: Service 구현
Phase 5: Controller / API 구현
Phase 6: Swagger 문서화
Phase 7: Test / 예외 케이스 검증
```

- [x] `tasks.md`는 `plan.md`의 Phase와 1:1로 대응한다.
- [x] 각 task는 하나의 커밋 또는 PR review 단위로 쪼갤 수 있을 만큼 구체적으로 작성한다.
- [x] 단순히 "구현"이라고 쓰지 않고, 어떤 DTO, 어떤 Repository 메서드, 어떤 ErrorCode인지 명시한다.
- [x] Phase마다 정상 케이스와 예외 케이스를 함께 고려한다.

---

## 4. Frontend API 계약 점검

### 4.1 기준 파일

- [x] 아래 프론트 파일의 endpoint와 타입을 확인하고 `api-schema.md`에 반영한다.

```text
frontend/src/api/user/member/authApi.ts
frontend/src/api/user/member/registerApi.ts
frontend/src/api/user/member/recoveryApi.ts
frontend/src/api/user/member/verificationApi.ts
frontend/src/api/user/member/socialRegisterApi.ts
frontend/src/types/user/member.ts
```

- [x] 아래 프론트 spec 문서와 충돌하지 않는지 확인한다.

```text
specs/frontend/user/member/spec.md
specs/frontend/user/member/api-schema.md
specs/frontend/user/member/checklist.md
```

### 4.2 Endpoint 목록

- [x] `api-schema.md`에 최소 아래 endpoint를 포함한다.

```text
POST /api/v1/user/members/login
POST /api/v1/user/members/token/refresh
POST /api/v1/user/members/logout
GET  /api/v1/user/members/me/status

GET  /api/v1/user/members/login-id/check?loginId={loginId}
POST /api/v1/user/members/verifications/send
POST /api/v1/user/members/verifications/confirm
POST /api/v1/user/members/register/user
POST /api/v1/user/members/register/company
POST /api/v1/user/members/company/employment-certificate
GET  /api/v1/user/members/oauth/{provider}/authorize
GET  /api/v1/user/members/oauth/{provider}/callback
POST /api/v1/user/members/recovery/find-id
POST /api/v1/user/members/recovery/password-token
POST /api/v1/user/members/recovery/reset-password
POST /api/v1/user/members/register/social/complete
```

- [x] 현재 구현 범위가 아닌 endpoint는 `v1 범위 외`, `후속 Phase`, `Mock 유지` 등으로 명확히 표시한다.
- [x] 소셜 로그인/가입은 OAuth authorize, callback, provider 검증, 기존 계정 로그인, 최초 가입 추가정보 완료 흐름까지 포함한다.

### 4.3 Mock 주의사항

- [x] `frontend/src/mocks/user/memberHandlers.ts`는 현재 로그인, token refresh, logout, me/status 중심 mock임을 명시한다.
- [x] 회원가입, 인증번호, 아이디 찾기, 비밀번호 재설정은 mock이 아니라 `api/user/member/*`와 `types/user/member.ts`를 기준으로 한다.
- [x] 백엔드 구현 완료 후 MSW mock 응답과 실제 API 응답 구조를 다시 맞춰야 한다고 적는다.
- [x] mock의 `mock-session` cookie 이름은 실제 backend refresh cookie 이름이 아니므로 spec에 그대로 쓰지 않는다.
- [x] 실제 refresh cookie 이름은 기존 backend auth 규칙에 맞춘다: `refreshToken`.

---

## 5. JWT / Session / Token 정책 점검

- [x] access token은 응답 body의 `data.accessToken`으로 반환한다.
- [x] access token은 프론트 memory authSession에만 저장한다고 명시한다.
- [x] access token을 `localStorage`에 저장하지 않는다고 명시한다.
- [x] refresh token은 HttpOnly Cookie로만 전달한다고 명시한다.
- [x] refresh token을 response body에 포함하지 않는다고 명시한다.
- [x] token refresh 요청 body로 `refreshToken`을 받지 않는다고 명시한다.
- [x] token refresh는 `credentials: include`로 cookie를 자동 전달하는 흐름과 맞춘다.
- [x] refresh response는 `TokenRefreshResponse`에 맞춰 `accessToken`만 반환한다.

```json
{
  "success": true,
  "message": "토큰이 갱신되었습니다.",
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

- [x] 기존 frontend spec의 "refreshToken body fallback" 또는 response body `refreshToken` 내용은 새 backend spec에서 수정한다.
- [x] refresh token은 Redis에 원문 저장하지 않고 hash 저장한다는 기존 auth constitution을 따른다.
- [x] refresh token rotation 시 기존 token은 즉시 무효화한다고 명시한다.
- [x] logout 시 refresh Redis key 삭제와 access token jti blacklist 등록을 고려한다.
- [x] 인증 필요 API는 `Authorization: Bearer {accessToken}`를 사용한다고 명시한다.
- [x] Controller에서 token을 직접 파싱하지 않고 SecurityContext 또는 `@AuthenticationPrincipal`을 사용한다고 적는다.
- [x] 계정 상태 검증은 JWT 진위 검증과 분리한다는 기존 auth 원칙을 깨지 않는다.

---

## 6. Public / Protected API 권한 점검

- [x] 아래 API는 인증 없이 접근 가능한 public API로 분류한다.

```text
POST /login
POST /token/refresh
GET  /login-id/check
POST /verifications/send
POST /verifications/confirm
POST /register/user
POST /register/company
POST /company/employment-certificate
POST /recovery/find-id
POST /recovery/password-token
POST /recovery/reset-password
POST /register/social/complete
```

- [x] `POST /logout`, `GET /me/status`는 인증 필요 API로 분류한다.
- [x] 실제 SecurityConfig의 permitAll 목록과 spec의 public API 목록이 일치해야 한다고 체크리스트에 포함한다.
- [x] `me/status`는 제한 계정도 상태 확인 가능해야 하는 예외 경로인지 확인한다.
- [x] 정지/차단 계정도 logout은 가능해야 한다는 기존 auth 원칙을 유지한다.

---

## 7. DTO / TypeScript 계약 점검

### 7.1 DTO naming

- [x] DTO는 기본적으로 `{Domain}DTO` 한 파일의 inner class 방식을 우선한다.
- [x] 기존 구현이 `UserLoginDto`처럼 기능별 DTO를 쓰고 있다면, 새 spec에서 DTO 분리 기준을 명시한다.
- [x] Entity를 API response로 직접 반환하지 않는다고 적는다.
- [x] DTO 필드에는 Swagger `@Schema` 설명을 추가한다고 적는다.
- [x] Enum 필드에는 allowable values를 Swagger에 명시한다고 적는다.

### 7.2 Login

- [x] Login request는 프론트 `LoginRequest`와 일치한다.

```json
{
  "loginId": "career_user01",
  "password": "Password123!",
  "roleType": "USER"
}
```

- [x] `roleType`은 필수이며 `USER`, `COMPANY`만 허용한다.
- [x] Login response는 프론트 `LoginResponse`와 일치한다.

```json
{
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
```

- [x] 기존 backend response에 `subscriptionStatus`가 포함될 수 있으면 프론트 타입과 맞출지, optional로 둘지 spec에 결정한다.

### 7.3 Personal register

- [x] Personal register request는 프론트 `UserRegisterRequest`와 일치한다.

```text
loginId
password
name
email
phone
emailVerificationToken
phoneVerificationToken
terms.service
terms.privacy
terms.marketing
```

- [x] 프론트의 `age` 동의는 화면 제출 전 필수 UX validation으로 처리하고, 백엔드 API request에는 포함하지 않는다고 명시한다.
- [x] response는 `memberId`, `roleType`, `memberStatus`를 반환한다.
- [x] 개인회원 가입 성공 시 `memberStatus=ACTIVE`, `roleType=USER`를 명시한다.

### 7.4 Company register

- [x] Company register request는 프론트 `CompanyRegisterRequest`와 일치한다.

```text
loginId
password
managerName
managerEmail
managerPhone
companyName
businessNumber
ceoName
address
addressDetail
companyType
isAgency
managerPhoneVerificationToken
managerEmailVerificationToken
employmentCertificateFileId
terms.service
terms.privacy
terms.companyVerification
terms.sms
terms.marketing
```

- [x] `companyType` enum 값을 프론트와 맞춘다.

```text
ENTERPRISE
SUBSIDIARY
SME
MID_MARKET
VENTURE
FOREIGN_INVESTED
FOREIGN_CORPORATION
PUBLIC
NON_PROFIT
FOREIGN_NON_PROFIT
```

- [x] 기업회원 가입 성공 시 `companyApprovalStatus=PENDING_REVIEW`를 명시한다.
- [x] 기업회원 가입 성공 시 token을 발급하지 않고 신청 접수 상태로 둔다.
- [x] 승인 대기/반려/보완 요청 기업회원은 로그인 시 token 발급 전 403으로 차단한다고 명시한다.
- [x] 승인/반려 결과 이메일 발송은 admin 승인/반려 service 책임이라고 명시한다.

### 7.5 Verification

- [x] Verification request/response는 프론트 타입과 일치한다.

```text
SendVerificationRequest: channel, target, purpose
SendVerificationResponse: verificationId, expiresAt, resendAvailableAt, remainingAttempts
ConfirmVerificationRequest: verificationId, code
ConfirmVerificationResponse: verificationToken, verifiedAt
```

- [x] `VerificationChannel`은 `EMAIL`, `PHONE`만 허용한다.
- [x] `VerificationPurpose`는 `REGISTER`, `FIND_ID`, `RESET_PASSWORD`를 허용한다.
- [x] 인증번호는 6자리 숫자로 검증한다.
- [x] 인증 완료 여부는 프론트 boolean이 아니라 서버 발급 `verificationToken`으로만 판단한다.

### 7.6 Recovery

- [x] Find ID request는 프론트 `FindIdRequest`와 일치한다.
- [x] 개인회원 아이디 찾기는 `roleType`, `verificationToken`을 사용한다.
- [x] 기업회원 아이디 찾기는 `roleType`, `verificationToken`, `managerName`, `businessNumber`를 사용한다.
- [x] Find ID response는 `maskedLoginIds`, `found`를 반환한다.
- [x] Password token request는 프론트 union type과 일치한다.
- [x] 개인회원 비밀번호 재설정 권한 발급은 `roleType`, `loginId`, `verificationToken`을 사용한다.
- [x] 기업회원 비밀번호 재설정 권한 발급은 `roleType`, `loginId`, `verificationToken`, `managerName`, `businessNumber`를 사용한다.
- [x] Password token response는 `resetToken`, `expiresAt`를 반환한다.
- [x] Reset password request는 `resetToken`, `newPassword`를 사용한다.
- [x] Reset password response는 `changedAt`를 반환한다.

---

## 8. Validation 정책 점검

- [x] 로그인 아이디는 프론트와 동일하게 영문/숫자 6~20자로 제한한다.

```text
^[A-Za-z0-9]{6,20}$
```

- [x] 이메일 형식 검증을 서버에서도 수행한다.
- [x] 휴대폰 번호는 `010`으로 시작하는 11자리 숫자로 정규화 및 검증한다.
- [x] 사업자등록번호는 숫자 10자리로 정규화 및 검증한다.
- [x] 기업명, 대표자명, 사업자등록증명원 발급번호를 필수로 검증한다.
- [x] 사업자등록번호/대표자명/기업명/발급번호는 외부 사업자 검증 API adapter로 검증한다고 명시한다.
- [x] 주소 검색은 이번 범위에서 프론트 버튼 활성화와 한국 도로명주소 API 연동까지 포함한다고 명시한다.
- [x] 기업회원 가입 request에 `certificateNumber`, `postalCode`, `roadAddress`, `jibunAddress` 추가가 필요하다고 명시한다.
- [x] 인증번호는 6자리 숫자로 검증한다.
- [x] 비밀번호 정책은 프론트와 동일하게 서버에서도 검증한다.

```text
8~64자
영문 포함
숫자 포함
특수문자 포함
loginId 포함 금지
```

- [x] 비밀번호 확인 값은 서버로 보내지 않지만, 서버는 `newPassword`와 `password` 자체 정책을 반드시 검증한다.
- [x] 필수 약관 동의는 서버에서도 검증한다.
- [x] 선택 약관은 저장 여부와 기본값을 spec에 명시한다.
- [x] 중복 확인 API를 통과했더라도 최종 가입 시점에 다시 loginId/email/phone/businessNumber 중복을 검증한다고 명시한다.
- [x] 프론트 검증은 UX 목적이고, 서버 검증이 권위라는 점을 명시한다.

---

## 9. Security / Privacy 점검

- [x] 비밀번호는 BCrypt로 hash 저장한다.
- [x] 비밀번호 평문 비교를 금지한다.
- [x] 비밀번호, 인증번호, resetToken, verificationToken은 로그에 남기지 않는다고 명시한다.
- [x] 로그인 실패 메시지는 계정 존재 여부를 노출하지 않는 공통 메시지를 사용한다.
- [x] 아이디 찾기 실패와 비밀번호 재설정 권한 발급 실패도 계정 존재 여부를 직접 노출하지 않는다.
- [x] 아이디 찾기 결과는 마스킹된 loginId만 반환한다.
- [x] `found=false`인 경우에도 일반 메시지를 사용한다.
- [x] resetToken은 짧은 만료시간을 가진 일회성 토큰으로 설계한다.
- [x] resetToken은 원문 저장하지 않고 hash 저장 여부를 검토한다.
- [x] verificationToken도 짧은 만료시간과 목적/purpose 바인딩을 가진다.
- [x] verificationToken은 target, channel, purpose와 함께 검증한다.
- [x] 이미 사용된 verificationToken 또는 resetToken 재사용을 금지한다.
- [x] rate limit이 필요한 API를 식별한다.

```text
POST /verifications/send
POST /verifications/confirm
POST /login
POST /recovery/password-token
POST /recovery/reset-password
```

- [x] 로그인 실패 5회 잠금 정책과 기존 Redis LoginAttemptStore / locked_until DB 정책을 깨지 않는다.
- [x] SUSPENDED / BANNED / WITHDRAWN / LOCKED 계정의 로그인/refresh 처리 정책을 기존 auth spec과 맞춘다.

---

## 10. Response / ErrorCode 점검

- [x] 모든 API는 `ApiResponse<T>` wrapper를 사용한다.
- [x] 성공 응답 필드는 `success`, `message`, `data`를 유지한다. (`status` 없음)
- [x] 실패 응답은 `success`, `status`, `message`, `code`(선택), `data`(null 유지) 구조로 맞춘다.
- [x] Controller에서 직접 `Map`을 반환하지 않는다고 명시한다.
- [x] Controller에서 반복 try-catch를 작성하지 않는다고 명시한다.
- [x] 예상 가능한 예외는 `CustomException + UserAuthErrorCode`로 처리한다고 명시한다.
- [x] `new RuntimeException(...)` 직접 사용을 금지한다.
- [x] domain error code 위치를 명시한다.

```text
backend/src/main/java/kr/co/carrer/user/member/exception/UserAuthErrorCode.java
```

- [x] 필요한 ErrorCode 후보를 `api-schema.md`에 표로 정리한다.

```text
LOGIN_ID_ALREADY_EXISTS        409
EMAIL_ALREADY_EXISTS           409
PHONE_ALREADY_EXISTS           409
BUSINESS_NUMBER_ALREADY_EXISTS 409
INVALID_VERIFICATION_CODE      400
VERIFICATION_EXPIRED           400
VERIFICATION_RATE_LIMITED      429
VERIFICATION_TOKEN_INVALID     400
REGISTER_TERMS_REQUIRED        400
AUTH_INVALID_CREDENTIALS       401
AUTH_ACCOUNT_LOCKED            423
PASSWORD_RESET_TOKEN_INVALID   400
PASSWORD_RESET_TOKEN_EXPIRED   400
PASSWORD_POLICY_VIOLATION      400
EMPLOYMENT_FILE_INVALID        400
EMPLOYMENT_FILE_TOO_LARGE      413
EMPLOYMENT_FILE_UNSUPPORTED    415
```

- [x] HTTP status와 프론트 처리 방식이 `specs/frontend/user/member/api-schema.md`와 맞는지 확인한다.

---

## 11. Database / Entity 점검

- [x] 테이블명은 lowercase snake_case plural을 사용한다.
- [x] 컬럼명은 snake_case를 사용한다.
- [ ] Java entity 필드는 camelCase를 사용한다.
- [ ] PK 필드명은 `{domain}Id`, DB 컬럼은 `{domain}_id` 형식을 따른다.
- [x] 기본 PK 타입은 기존 member 정책과 맞춘다.
  - 기존 auth constitution 기준: members = UUID
- [x] 외부에 노출되는 식별자는 UUID 사용을 우선 검토한다.
- [ ] Entity에는 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`를 사용한다.
- [ ] Entity setter를 무분별하게 열지 않는다.
- [ ] 상태 변경은 의미 있는 메서드 또는 Service를 통해 수행한다.
- [x] Enum은 `EnumType.STRING`으로 저장한다.
- [x] 도메인 enum은 `type/` 패키지에 둔다.
- [x] `members.role_type`은 `USER`, `COMPANY`로 저장하고 `ROLE_` prefix는 security authority에서만 사용한다.
- [x] `members.member_status`는 `BLACKLISTED`까지 포함한다.
- [x] `hr_managers.hr_status`는 `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED`로 맞춘다.
- [x] password reset token 저장소는 DB `password_reset_tokens`로 확정한다.
- [x] refresh token 저장용 DB 테이블은 사용하지 않는다. 기존 정책상 Redis를 사용한다.
- [x] 인증번호/verification 저장 위치는 DB `member_verifications`로 확정한다.
- [x] 이메일 인증 provider는 `AWS SES`, SMS 인증 provider는 `SOLAPI / CoolSMS`로 확정한다.
- [x] 기업 검증은 국세청 사업자등록정보 `status` API를 `businessNumber`만으로 호출한다고 명시한다.
- [x] `member_verifications` 기준 `expires_at`, `resend_available_at`, `remaining_attempts`, `verification_token` 사용 방식을 명시한다.
- [x] `socialSignupToken` 저장소는 Redis로 확정하고 `user-auth:social-signup:{tokenHash}`, TTL 10분, 1회 사용 삭제 정책을 명시한다.
- [x] `companyApprovalStatus=NONE`은 DB 저장값이 아니라 개인회원 응답 전용 가상값임을 명시한다.
- [x] 개인회원 약관 저장 시 `company_verification_agreed`, `sms_agreed`는 `null`로 저장한다고 명시한다.
- [x] DB unique 제약 후보를 명시한다.

```text
members.login_id
members.email
members.phone
company_profiles.business_number
```

---

## 12. File Upload / Company Register 점검

- [x] 재직증명서 업로드 API는 `multipart/form-data`로 명시한다.
- [x] 프론트는 먼저 파일 업로드를 호출하고, 가입 요청에는 `employmentCertificateFileId`만 포함한다는 흐름을 명시한다.
- [x] PDF만 허용한다고 명시한다.
- [x] 최대 파일 크기는 프론트 기준 5MB이며, 서버도 동일하게 검증한다고 명시한다.
- [x] MIME type과 확장자를 모두 확인한다고 명시한다.
- [ ] 파일 저장소가 확정되지 않았다면 local/S3/임시 저장 중 어떤 전략인지 명시한다.
- [x] 파일 업로드 성공 후 가입 실패 시 orphan file 처리 정책을 적는다.
- [x] 가입 요청의 `employmentCertificateFileId`가 실제 업로드된 파일인지 서버에서 검증한다고 명시한다.

---

## 13. Swagger / Docs 점검

- [x] Swagger annotation은 Controller가 아니라 `docs` 인터페이스에 작성한다고 명시한다.

```text
UserAuthControllerDocs.java
UserRegisterControllerDocs.java
UserRecoveryControllerDocs.java
UserVerificationControllerDocs.java
```

- [x] Controller에는 Swagger annotation을 최소화한다고 적는다.
- [x] Swagger request/response 예시는 `api-schema.md`와 일치해야 한다.
- [x] Error response 예시도 Swagger에 포함한다고 적는다.
- [x] Enum allowable values를 Swagger에 표시한다고 적는다.
- [x] `api-schema.md`와 Swagger가 어긋나지 않도록 checklist에 포함한다.

---

## 14. Test 계획 점검

- [x] `checklist.md`에 정상 케이스와 예외 케이스 테스트를 포함한다.
- [x] Login 테스트를 포함한다.

```text
정상 로그인
roleType 불일치
비밀번호 불일치
존재하지 않는 loginId
잠금 계정
정지/탈퇴 계정
refresh cookie 없음
logout
```

- [x] Register 테스트를 포함한다.

```text
개인회원 정상 가입
기업회원 정상 가입
loginId 중복
email 중복
phone 중복
businessNumber 중복
verificationToken 없음
verificationToken 만료
필수 약관 미동의
비밀번호 정책 위반
```

- [x] Verification 테스트를 포함한다.

```text
인증번호 발송
인증번호 확인 성공
잘못된 code
만료된 code
재전송 제한
시도 횟수 초과
purpose 불일치
target 불일치
```

- [x] Recovery 테스트를 포함한다.

```text
개인 아이디 찾기 성공
기업 아이디 찾기 성공
결과 없음 found=false
마스킹 처리 확인
비밀번호 resetToken 발급
resetToken 만료
resetToken 재사용 차단
비밀번호 재설정 성공
새 비밀번호 정책 위반
```

- [x] File upload 테스트를 포함한다.

```text
PDF 업로드 성공
PDF 아님
MIME 불일치
5MB 초과
fileId 없는 기업 가입
```

- [x] 실제 프론트 API client와 연동 가능한 response 구조인지 확인하는 통합 테스트 또는 수동 검증 항목을 포함한다.

---

## 15. Frontend Integration 최종 점검

- [x] `memberApiClient`는 response에서 `payload.data`만 반환하므로 backend response는 반드시 `data`를 포함한다.
- [x] 204 No Content처럼 data가 없는 응답을 사용할 경우 프론트 처리 가능 여부를 확인한다.
- [x] login 성공 후 `authSession.setTokens({ accessToken })`가 가능하도록 `accessToken` 필드를 유지한다.
- [x] login 성공 후 `authSession.setMember(member)`가 가능하도록 `member` 객체 필드를 유지한다.
- [x] frontend `LoginRouteDecision`이 판단할 수 있도록 `roleType`, `memberStatus`, `companyApprovalStatus`를 반환한다.
- [x] `memberStatus` 값은 프론트 enum과 맞춘다.

```text
ACTIVE
SUSPENDED
BANNED
LOCKED
WITHDRAWN
BLACKLISTED
```

- [x] `companyApprovalStatus` 값은 프론트 enum과 맞춘다.

```text
NONE
PENDING_REVIEW
APPROVED
REJECTED
NEEDS_REVISION
```

- [x] 401 응답 시 프론트가 token refresh 또는 login redirect 흐름을 수행할 수 있도록 `status`를 정확히 준다.
- [ ] 상태 변경 요청에 대한 401 자동 재시도는 기본 금지이므로, POST API가 중복 실행되지 않도록 설계한다.
- [ ] idempotency가 필요한 endpoint가 있다면 spec에 별도 명시한다.

---

## 16. 문서별 필수 포함 항목

### spec.md

- [x] 기능 범위와 제외 범위
- [x] User Story와 Acceptance Scenario
- [x] Functional Requirements
- [x] Key Entities
- [x] Security / Privacy 요구사항
- [x] Edge Cases
- [x] Success Criteria
- [x] Assumptions

### plan.md

- [x] Summary
- [x] Technical Context
- [x] Project Structure
- [x] Entity / Repository / DTO / Service / Controller / Swagger / Test Phase
- [x] JWT, Redis, verification, password reset token 설계 결정
- [x] 프론트 mock 교체 및 연동 계획

### tasks.md

- [x] plan.md Phase와 1:1 대응
- [x] 각 task가 구체적인 구현 단위
- [x] DTO, Repository method, ErrorCode, Test task가 빠지지 않음
- [x] Swagger docs task 포함
- [x] frontend integration 확인 task 포함

### api-schema.md

- [x] 공통 응답 형식
- [x] 인증/쿠키/JWT 정책
- [x] Enum 계약
- [x] Endpoint별 request/response/error
- [x] ErrorCode to HTTP mapping
- [x] Frontend type 매핑
- [x] Mock 주의사항

### checklist.md

- [x] 구현 완료 후 자체 검증 항목
- [x] Convention 준수 항목
- [x] JWT/token 정책 준수 항목
- [x] Frontend contract 준수 항목
- [x] Test 완료 항목
- [x] Swagger / docs 일치 항목

---

## 17. 최종 자기검사 질문

- [x] 이 spec만 보고 백엔드 구현자가 endpoint, DTO, ErrorCode를 만들 수 있는가?
- [x] 이 spec만 보고 프론트 구현자가 mock을 실제 API로 바꿀 수 있는가?
- [x] 기존 JWT auth constitution과 충돌하는 내용이 없는가?
- [x] refresh token을 body로 주고받는 잘못된 내용이 남아 있지 않은가?
- [x] access token을 localStorage에 저장한다는 내용이 남아 있지 않은가?
- [x] 로그인/찾기/재설정 실패 메시지가 계정 존재 여부를 노출하지 않는가?
- [x] 서버 검증 없이 프론트 validation만 믿는 흐름이 없는가?
- [x] Controller가 token을 직접 파싱하는 흐름을 요구하지 않는가?
- [x] Swagger docs 분리 원칙이 반영되어 있는가?
- [x] `ApiResponse<T>` 통일 원칙이 모든 endpoint에 반영되어 있는가?
- [x] `admin`과 `user` 도메인을 직접 참조하는 설계가 없는가?
- [x] 새 테이블/컬럼명이 DB convention과 맞는가?
- [x] 테스트 계획이 정상/실패/보안/연동 케이스를 모두 포함하는가?
