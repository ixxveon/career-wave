# Feature Specification: 사용자 인증 기능 (Backend)

**Feature Branch**: `docs/frontend-user-auth-spec`
**Status**: Draft
**Layer**: Backend (Spring Boot)

---

## 1. 개요

사용자 인증 기능은 개인회원/기업회원의 회원가입, 로그인, 소셜 로그인, 아이디 찾기, 비밀번호 재설정을 제공한다.
본 문서는 프론트엔드 사용자 인증 화면과 연동되는 백엔드 API, 데이터 검증, 보안 정책, 예외 처리 기준을 정의한다.
JWT 발급/재발급/로그아웃의 핵심 흐름은 기존 `specs/backend/auth/`의 공통 인증 규칙을 따른다.

---

## 2. 범위

### 2.1 포함 범위

- 개인회원 회원가입
- 기업회원 회원가입
- 로그인 아이디 중복 확인
- 이메일/휴대폰 인증번호 발송 및 확인
- 로그인
- 소셜 OAuth 로그인/회원가입
- 소셜 회원가입 추가정보 완료
- 토큰 재발급
- 로그아웃
- 내 회원 상태 조회
- 아이디 찾기
- 비밀번호 재설정 권한 발급
- 비밀번호 재설정
- 기업회원 재직증명서 PDF 업로드 계약

### 2.2 제외 범위

- 기업회원 승인/반려 처리 관리자 화면 및 승인 API
- 구독/결제/자동 결제/Toss 결제 기능
- 회원 탈퇴, 프로필 수정, 휴면 계정 정책

> 기업회원 승인/반려 자체는 admin 기능에서 처리한다. 다만 사용자 인증 spec은 기업회원 가입 신청 생성, 승인 전 로그인 차단, 승인 상태 조회, 승인 완료 후 로그인 가능 조건을 계약으로 정의한다.

---

## 3. 기준 문서 및 코드

- `docs/CONVENTION.md`
- `specs/backend/auth/spec.md`
- `specs/backend/auth/api-schema.md`
- `specs/backend/auth/constitution.md`
- `specs/frontend/user/member/spec.md`
- `specs/frontend/user/member/api-schema.md`
- `frontend/src/types/user/member.ts`
- `frontend/src/api/user/member/authApi.ts`
- `frontend/src/api/user/member/registerApi.ts`
- `frontend/src/api/user/member/recoveryApi.ts`
- `frontend/src/api/user/member/verificationApi.ts`
- `frontend/src/api/user/member/socialRegisterApi.ts`

---

## 4. User Scenarios & Testing

### User Story 1 - 개인/기업 로그인 (Priority: P1)

사용자는 개인회원 또는 기업회원 유형을 선택하여 로그인하고, 계정 상태에 따라 로그인 성공 또는 로그인 차단 안내를 받아야 한다.

**Acceptance Scenarios**:
1. **Given** 활성 개인회원이 올바른 `loginId`, `password`, `roleType=USER`를 제출하면, **When** 로그인 API가 호출될 때, **Then** access token과 회원 요약 정보가 반환되고 refresh token은 HttpOnly Cookie로 설정된다.
2. **Given** 기업회원 탭에서 개인회원 계정으로 로그인하면, **When** `roleType=COMPANY` 요청이 들어올 때, **Then** 공통 로그인 실패 메시지로 401을 반환한다.
3. **Given** 승인 대기 기업회원이 로그인하면, **Then** access token과 refresh token을 발급하지 않고 403 응답과 승인 대기 안내 메시지를 반환한다.
4. **Given** 잠금, 정지, 차단, 탈퇴 계정이 로그인하면, **Then** 기존 auth 정책에 맞는 제한 응답을 반환한다.

### User Story 2 - 개인회원 회원가입 (Priority: P1)

개인 사용자는 아이디 중복 확인, 이메일/휴대폰 인증, 비밀번호 정책, 필수 약관 동의를 완료한 뒤 회원가입할 수 있어야 한다.

**Acceptance Scenarios**:
1. **Given** 사용 가능한 `loginId`와 유효한 인증 token이 제출되면, **When** 개인회원 가입 API가 호출될 때, **Then** `members`에 `roleType=USER`, `memberStatus=ACTIVE` 회원이 생성된다.
2. **Given** 이미 사용 중인 `loginId`, 이메일, 휴대폰 번호가 제출되면, **Then** 409 에러를 반환한다.
3. **Given** 만료되었거나 목적이 다른 `verificationToken`이 제출되면, **Then** 회원가입을 거부한다.
4. **Given** 비밀번호가 정책을 만족하지 않으면, **Then** 400 에러를 반환한다.

### User Story 3 - 기업회원 회원가입 (Priority: P1)

기업 담당자는 기업 정보, 담당자 인증, 재직증명서 업로드, 필수 약관 동의를 완료하여 기업회원 가입 신청을 할 수 있어야 한다.

**Acceptance Scenarios**:
1. **Given** 기업 정보와 담당자 인증 token, `employmentCertificateFileId`가 유효하면, **When** 기업회원 가입 API가 호출될 때, **Then** `roleType=COMPANY`, `companyApprovalStatus=PENDING_REVIEW` 상태로 가입 신청이 생성된다.
2. **Given** 기업회원 가입 신청이 생성되면, **Then** access token/refresh token을 발급하지 않고 신청 접수 안내 메시지를 반환한다.
3. **Given** admin이 HR 담당자 소속을 확인하고 승인하면, **Then** 기업회원은 `companyApprovalStatus=APPROVED` 상태가 되고 이후 로그인할 수 있다.
4. **Given** admin이 가입 신청을 승인/반려하면, **Then** 신청 시 입력한 담당자 이메일로 승인/반려 결과 안내 메일을 발송한다.
5. **Given** 사업자등록번호가 이미 존재하면, **Then** 409 에러를 반환한다.
6. **Given** PDF가 아닌 파일 또는 5MB 초과 파일이 업로드되면, **Then** 파일 업로드 API는 400/413/415 계열 에러를 반환한다.

### User Story 4 - 소셜 로그인/회원가입 (Priority: P1)

사용자는 Kakao/Naver/Google OAuth 인증을 통해 로그인하거나, 최초 소셜 인증 후 추가정보를 입력하여 개인회원으로 가입할 수 있어야 한다.

**Acceptance Scenarios**:
1. **Given** 사용자가 지원 provider의 소셜 로그인 버튼을 누르면, **When** OAuth authorize API가 호출될 때, **Then** 백엔드는 provider 인증 URL과 state를 생성하거나 해당 URL로 redirect한다.
2. **Given** provider callback으로 `code`와 `state`가 전달되면, **When** 백엔드가 provider token과 사용자 정보를 검증할 때, **Then** state 불일치 또는 provider 검증 실패 시 로그인을 거부한다.
3. **Given** 이미 연결된 소셜 계정이면, **Then** 일반 로그인과 동일하게 access token과 refresh token cookie를 발급한다.
4. **Given** 연결된 회원이 없으면, **Then** 짧은 TTL의 `socialSignupToken`을 발급하고 프론트의 `/register/social/complete`로 추가정보 입력을 유도한다.
5. **Given** 사용자가 유효한 `socialSignupToken`, 휴대폰 인증 token, 필수 약관 동의를 제출하면, **Then** 개인회원과 social account 연결 정보를 생성한다.

### User Story 5 - 아이디 찾기 (Priority: P1)

사용자는 인증 완료 후 본인 계정의 마스킹된 로그인 아이디 목록을 확인할 수 있어야 한다.

**Acceptance Scenarios**:
1. **Given** 개인회원이 이메일 또는 휴대폰 인증을 완료하면, **When** 아이디 찾기 API가 호출될 때, **Then** 마스킹된 `loginId` 목록을 반환한다.
2. **Given** 기업회원이 담당자명, 사업자등록번호, 담당자 이메일 인증을 완료하면, **Then** 마스킹된 기업회원 `loginId` 목록을 반환한다.
3. **Given** 일치하는 계정이 없으면, **Then** 계정 존재 여부를 직접 노출하지 않는 일반 메시지와 `found=false`를 반환한다.

### User Story 6 - 비밀번호 재설정 (Priority: P1)

사용자는 본인 인증 후 서버가 발급한 reset token으로 새 비밀번호를 설정할 수 있어야 한다.

**Acceptance Scenarios**:
1. **Given** 사용자 식별 정보와 인증 token이 유효하면, **When** 비밀번호 재설정 권한 API가 호출될 때, **Then** 짧은 만료 시간을 가진 `resetToken`을 반환한다.
2. **Given** 유효한 `resetToken`과 새 비밀번호가 제출되면, **When** 비밀번호 재설정 API가 호출될 때, **Then** BCrypt hash로 비밀번호를 변경하고 token을 재사용 불가 처리한다.
3. **Given** 만료되었거나 이미 사용된 `resetToken`이면, **Then** 비밀번호 변경을 거부한다.

---

## 5. Functional Requirements

- **FR-001**: 모든 API 응답은 `ApiResponse<T>`를 사용한다.
- **FR-002**: 로그인 요청은 `loginId`, `password`, `roleType`을 필수로 받는다.
- **FR-003**: 로그인 성공 시 access token은 response body에, refresh token은 HttpOnly Cookie에만 담는다.
- **FR-004**: refresh token은 request body 또는 response body로 주고받지 않는다.
- **FR-005**: access token은 영속 저장하지 않으며 프론트 memory session에만 저장하는 흐름을 전제로 한다.
- **FR-006**: 개인회원 가입은 loginId 중복 확인, 이메일 인증, 휴대폰 인증, 비밀번호 정책, 필수 약관 동의를 요구한다.
- **FR-007**: 기업회원 가입은 담당자 휴대폰/이메일 인증, 사업자등록번호, 기업 정보, 재직증명서 업로드, 필수 약관 동의를 요구한다.
- **FR-008**: 인증 완료 여부는 프론트 boolean이 아니라 서버 발급 `verificationToken`으로만 판단한다.
- **FR-008A**: 이메일 인증번호 발송은 `AWS SES`를 사용하고, 개발 단계에서는 SES Sandbox 정책에 따라 검증된 이메일 대상으로 테스트한다.
- **FR-008B**: 휴대폰 인증번호 발송은 `SOLAPI / CoolSMS`를 사용한다.
- **FR-008C**: 이메일/SMS 인증번호와 `verificationToken`은 ERD의 `member_verifications` 테이블 기준으로 관리한다.
- **FR-009**: 아이디 찾기 응답은 마스킹된 loginId만 반환한다.
- **FR-010**: 비밀번호 재설정은 서버 발급 `resetToken`이 있을 때만 가능하다.
- **FR-011**: 로그인/아이디 찾기/비밀번호 재설정 실패 메시지는 계정 존재 여부를 직접 노출하지 않는다.
- **FR-012**: Controller는 token을 직접 파싱하지 않고 SecurityContext 또는 `@AuthenticationPrincipal`을 사용한다.
- **FR-013**: Swagger annotation은 가능한 `docs` 인터페이스로 분리한다.
- **FR-014**: Entity를 API 응답으로 직접 반환하지 않고 DTO로 변환한다.
- **FR-015**: 예상 가능한 예외는 `CustomException`과 도메인 `UserAuthErrorCode`로 처리한다.
- **FR-016**: 프론트의 `age` 동의는 화면 제출 전 필수 UX validation으로 처리하며, 백엔드 API request에는 포함하지 않는다.
- **FR-017**: 백엔드는 개인회원 가입 시 `terms.service=true`, `terms.privacy=true`를 필수 약관으로 검증한다.
- **FR-018**: 비밀번호 재설정 성공 시 해당 회원의 모든 refresh token을 폐기하고 재로그인을 유도한다.
- **FR-019**: 승인 대기/반려/보완 요청 상태의 기업회원은 로그인 성공 token을 발급받을 수 없다.
- **FR-020**: 기업회원 가입 신청 완료 응답은 "가입 완료"가 아니라 "가입 신청 접수" 의미로 작성한다.
- **FR-021**: 기업회원 승인/반려 결과 메일 발송은 admin 승인/반려 기능의 책임이며, user auth는 신청 상태와 담당자 이메일을 저장한다.
- **FR-022**: 소셜 로그인은 provider authorization, callback, provider token 검증, social account 연결, 최초 가입 추가정보 완료 흐름을 포함한다.
- **FR-022A**: 소셜 로그인 provider는 `Kakao`, `Naver`, `Google`만 지원하며 `Apple` 로그인은 구현 범위에서 제외한다.
- **FR-022B**: OAuth 회원 식별은 email이 아니라 반드시 `provider + providerUserId` 조합을 기준으로 처리한다.
- **FR-022C**: `providerEmail`은 nullable이며, Kakao는 email 존재를 전제하지 않는다.
- **FR-023**: 소셜 최초 가입 전에는 일반 access/refresh token을 발급하지 않고 짧은 TTL의 `socialSignupToken`만 사용한다.
- **FR-024**: 개인회원 가입 성공 시 기본값이 비어 있는 `personal_profiles` row를 함께 생성한다.
- **FR-025**: `members.role_type`은 DB/API/JWT에서 `USER`, `COMPANY`를 사용하고, Spring Security authority에서만 `ROLE_` prefix를 적용한다.

---

## 6. Non-Functional Requirements

- **NFR-001**: 비밀번호는 BCrypt hash로 저장하고 평문 비교를 금지한다.
- **NFR-002**: 인증번호, 비밀번호, refresh token, reset token, verification token은 로그에 남기지 않는다.
- **NFR-003**: 인증번호 발송/확인, 로그인, 비밀번호 재설정 API는 명시된 rate limit 정책을 적용한다.
- **NFR-004**: refresh token은 Redis에 hash로 저장하고 TTL을 만료 시간과 일치시킨다.
- **NFR-005**: DB 상태와 Redis 상태가 충돌할 경우 계정 권위 상태는 DB를 기준으로 한다.
- **NFR-006**: 프론트 validation은 UX 목적이며 백엔드 validation이 최종 권위다.
- **NFR-007**: 외부 API Key, OAuth Client Secret, Service Key는 코드에 하드코딩하지 않고 환경변수로만 주입한다.

---

## 7. Key Entities

### Member

- `memberId`: UUID
- `loginId`: 로그인 아이디, unique
- `email`: 이메일, unique
- `phone`: 휴대폰 번호, unique, null 허용
- `password`: BCrypt hash
- `name`: 회원명 또는 담당자명
- `roleType`: `USER`, `COMPANY`
- `memberStatus`: `ACTIVE`, `SUSPENDED`, `BANNED`, `LOCKED`, `WITHDRAWN`, `BLACKLISTED`
- `subscriptionStatus`: `FREE`, `PREMIUM`, 가입 시 기본값 `FREE`
- `warningCount`: 경고 누적 횟수, 가입 시 기본값 `0`
- `suspendEndDate`: 정지 종료일, 가입 시 기본값 `null`
- `lockedUntil`: 잠금 해제 시각
- `lastLoginAt`: 마지막 로그인 시각

> ERD 기준: `members.role_type`은 API/JWT enum과 동일한 `USER`/`COMPANY`로 저장한다.
> Spring Security `GrantedAuthority`가 필요할 때만 backend security layer에서 `ROLE_` prefix를 붙인다.
> ERD 기준: `members.member_status` CHECK에는 `BLACKLISTED`를 포함한다.
> `BANNED`는 서비스 이용 정지 상태, `BLACKLISTED`는 재가입 또는 주요 서비스 접근 차단 대상 상태로 구분한다.
> `members.phone`은 unique로 관리한다. PostgreSQL unique 제약 특성상 null은 여러 row에 허용되지만, 가입 request에서 phone이 필요한 흐름은 백엔드가 phone 인증과 중복 검사를 반드시 수행한다.

### PersonalProfile

- `personalProfileId`
- `memberId`
- `targetJob`: 가입 시 `null`
- `githubUrl`: 가입 시 `null`
- `profileImageUrl`: 가입 시 `null`
- `createdAt`
- `updatedAt`

> ERD 기준 테이블: `personal_profiles`.
> 개인회원 가입 성공 시 빈 `personal_profiles` row를 함께 생성한다.

### CompanyProfile

- `companyProfileId`
- `memberId`
- `companyName`
- `businessNumber`: 사업자등록번호, unique
- `ceoName`
- `address`
- `postalCode`
- `roadAddress`
- `jibunAddress`
- `addressDetail`
- `companyType`
- `isAgency`
- `certificateNumber`
- `certFileUrl`
- `certFileName`

> ERD 기준 테이블: `company_profiles`.
> 담당자명/담당자 연락처는 현재 ERD 기준 `members.name`, `members.email`, `members.phone` 및 `hr_managers` 연결 정책과 함께 구현 시 정렬한다.

### HrManager

- `hrManagerId`
- `memberId`
- `companyProfileId`
- `hrStatus`: `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED`
- `approvedAt`
- `rejectReason`

> ERD 기준 테이블: `hr_managers`.
> ERD 기준: `hr_managers.hr_status`는 API의 `companyApprovalStatus`와 같은 승인 상태값을 저장한다.
> `company_profiles`에는 승인 상태 컬럼을 추가하지 않는다.
> `companyApprovalStatus=NONE`은 DB에 저장하지 않는 API 응답 전용 가상값이다.
> 개인회원(`roleType=USER`)은 `hr_managers` row가 없으므로 API 응답에서 항상 `companyApprovalStatus=NONE`을 반환한다.
> 기업회원(`roleType=COMPANY`)은 기본적으로 `hr_managers.hr_status`를 `companyApprovalStatus`로 반환한다.
> 로그인은 `hrStatus=APPROVED`인 기업회원만 성공한다.
> `REMOVED`는 승인 이후 HR 담당자 연결이 제거된 상태이며, 가입 신청 반려는 `REJECTED`로 저장한다.
> `REMOVED`는 로그인 권한 판정에서는 차단 상태로 처리하며 access token / refresh token을 발급하지 않는다.
> 현재 user API의 `companyApprovalStatus` enum에는 `REMOVED`를 노출하지 않으므로, 응답 변환 시 `REMOVED`는 `NONE`으로 매핑한다.

### MemberVerification

- `verificationId`
- `channel`: `EMAIL`, `PHONE`
- `target`
- `purpose`: `REGISTER`, `FIND_ID`, `RESET_PASSWORD`
- `codeHash`
- `expiresAt`
- `resendAvailableAt`
- `remainingAttempts`
- `status`
- `verificationToken`: 인증 완료 후 발급되는 token — nullable, unique

> ERD 기준 테이블: `member_verifications`.
> 가입 전 인증도 처리해야 하므로 회원 FK 없이 `target`과 `purpose` 기준으로 관리한다.
> 인증번호 원문은 저장하지 않고 `code_hash`를 저장한다.
> 인증 완료 후 발급하는 `verificationToken`은 `member_verifications.verification_token`에 저장한다.
> `verification_token`은 `uq_member_verification_token` unique constraint로 관리한다 — `findByVerificationToken` 조회 결과의 유일성 보장.
> `markVerified(token)`는 null·빈 token을 즉시 실패 처리한다 — 빈 token으로 VERIFIED 상태가 되는 것을 방어.

### PasswordResetToken

- `resetTokenId`
- `memberId`
- `tokenHash`: unique
- `expiresAt`
- `usedAt`
- `createdAt`

> ERD 기준 테이블: `password_reset_tokens`.
> reset token 원문은 저장하지 않고 `token_hash`만 저장한다.
> `token_hash`는 `uq_password_reset_token_hash` unique constraint로 관리한다.
> 만료 판정은 `!Instant.now().isBefore(expiresAt)` — `now == expiresAt` 경계 포함 만료 처리.
> 중복 발급 방지는 tokenHash가 아닌 `memberId` 기준으로 확인한다 — `existsByMemberIdAndUsedAtIsNullAndExpiresAtAfter(memberId, now)`.

### SocialAccount

- `socialAccountId`
- `memberId`
- `provider`: `KAKAO`, `NAVER`, `GOOGLE`
- `providerUserId`
- `providerEmail`
- `linkedAt`
- `createdAt`
- `updatedAt`

> ERD 기준 테이블: `social_accounts`.
> providerUserId 원문과 provider 조합은 unique로 관리한다.

#### Proposed ERD Addition

```sql
CREATE TABLE social_accounts (
    social_account_id UUID PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_user_id),
    UNIQUE (member_id, provider),
    CHECK (provider IN ('KAKAO', 'NAVER', 'GOOGLE'))
);

CREATE INDEX idx_social_accounts_member_id ON social_accounts(member_id);
```

> `provider_user_id`는 provider가 내려주는 고유 사용자 식별자다.
> `provider_email`은 provider 정책에 따라 없을 수 있으므로 nullable로 둔다.
> 한 회원이 같은 provider를 중복 연결하지 않도록 `UNIQUE (member_id, provider)`를 둔다.

### Employment Certificate File

- 최종 저장 위치: `company_profiles.cert_file_url`, `company_profiles.cert_file_name`, `company_profiles.certificate_number`
- 가입 전 임시 `employmentCertificateFileId`는 S3 object key 또는 임시 업로드 식별자로 사용한다.
- 기업회원 가입 성공 시 임시 fileId를 `company_profiles`의 재직증명서 컬럼으로 확정 저장한다.
- `company_profiles.cert_file_url`, `company_profiles.cert_file_name`, `company_profiles.certificate_number`는 기업회원 가입 성공 시 필수 값이다.
- 기업회원 가입 실패 또는 24시간 내 미사용 fileId는 정리 대상이다.

---

## 8. Validation Rules

- `loginId`: 영문/숫자 조합 6~20자, `^[A-Za-z0-9]{6,20}$`
- `password`: 8~64자, 영문/숫자/특수문자 포함, loginId 포함 금지
- `email`: 이메일 형식
- `phone`: `010`으로 시작하는 11자리 숫자
- `businessNumber`: 숫자 10자리
- `businessNumber`: 국세청 사업자등록정보 상태조회 API로 검증한다.
- `verificationCode`: 6자리 숫자
- `companyType`: 프론트 `CompanyType` enum 허용값만 사용
- `postalCode`: Kakao(Daum) 우편번호 서비스 검색 결과의 우편번호(`zonecode`)를 사용한다. 필수값.
- `roadAddress`: Kakao(Daum) 우편번호 서비스 검색 결과의 도로명주소를 사용한다. 필수값.
- `jibunAddress`: Kakao(Daum) 우편번호 서비스 검색 결과의 지번주소가 있을 경우 저장한다. 선택값.
- `addressDetail`: 사용자가 직접 입력하는 상세주소이며 선택값이다.
- 백엔드 INSERT 시 `company_profiles.address`(DB NOT NULL) 컬럼은 `roadAddress` 값으로 채운다.
- `employmentCertificate`: PDF, MIME type `application/pdf`, 최대 5MB
- 개인회원 필수 약관: `terms.service=true`, `terms.privacy=true`
- 개인회원 선택 약관: `terms.marketing=false` 기본값, 제출값을 `member_terms_agreements.marketing_agreed`에 저장한다.
- 개인회원의 기업 전용 약관 컬럼은 `member_terms_agreements.company_verification_agreed=null`, `sms_agreed=null`로 저장한다.
- 기업회원 필수 약관: `terms.service=true`, `terms.privacy=true`, `terms.companyVerification=true`, `terms.sms=true`
- 기업회원 선택 약관: `terms.marketing=false` 기본값, 제출값을 `member_terms_agreements.marketing_agreed`에 저장한다.
- 프론트 `age` 동의는 API request에 포함하지 않으며, 백엔드는 저장/검증하지 않는다.
- 소셜 회원가입 필수 약관은 개인회원 가입과 동일하게 `terms.service=true`, `terms.privacy=true`다.
- 소셜 회원가입 선택 약관도 `terms.marketing=false` 기본값으로 저장한다.

### 8.1 기업 정보 외부 검증

- 기업회원 가입 신청 시 사업자등록번호 10자리 형식 검증만으로 승인하지 않는다.
- 백엔드는 공공데이터포털 `국세청 사업자등록정보 상태조회(status)` API를 사용한다.
- 이번 단계에서는 `businessNumber`만으로 status API를 호출한다.
- `start_dt`, `p_nm`, `ceoName`, `certificateNumber`를 외부 API 검증 파라미터로 사용하지 않는다.
- 외부 API 응답으로 사업자 존재 여부, 정상 사업자 여부, 휴업 여부, 폐업 여부를 확인한다.
- status 조회 결과가 유효하면 기업 인증 검증 상태를 통과 처리하고 가입 신청을 생성한다.
- 외부 API 장애, 타임아웃, 일시 제한 초과 시에는 가입 신청을 실패시킨다 (`COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE 503`). `PENDING_REVIEW` 자동 전환은 하지 않는다.
- 프론트 주소 검색은 Kakao(Daum) 우편번호 서비스를 사용한다. 별도 API Key 불필요.
- 프론트는 `CompanyRegisterForm`의 "주소 검색" 버튼 클릭 시 Daum Postcode 팝업을 열고, 선택 결과를 `postalCode`, `roadAddress`, `jibunAddress`에 자동 입력한다.
- 프론트는 `postalCode`, `roadAddress`, `jibunAddress`, `addressDetail`, `certificateNumber`를 가입 request에 포함한다.
- 백엔드는 `postalCode`, `roadAddress`를 필수 검증하고 `addressDetail`, `jibunAddress`는 선택값으로 저장한다.

---

## 9. Security Rules

- 로그인 실패 시 계정 존재 여부가 노출되지 않는 공통 메시지를 사용한다.
- 아이디 찾기와 비밀번호 재설정 권한 발급도 계정 존재 여부를 직접 노출하지 않는다.
- `verificationToken`은 purpose, target, channel, expiresAt, verificationStatus를 검증한다.
- `resetToken`은 짧은 TTL을 가지며 1회 사용 후 폐기한다.
- `resetToken`과 인증번호는 원문 저장하지 않고 hash 저장을 우선한다.
- 이메일 인증은 `EmailSenderPort` -> `AwsSesEmailSenderAdapter` 구조로 구현한다.
- SMS 인증은 `SmsSenderPort` -> `SolapiSmsSenderAdapter` 구조로 구현한다.
- 로컬/개발 설정에서도 외부 API 연동 정보는 `.env` 기반 환경변수로만 주입한다.
- refresh token은 기존 auth constitution에 따라 Redis hash 저장, rotation, cookie-only 흐름을 따른다.
- Access token blacklist는 로그아웃 시 현재 access token의 jti를 등록한다.
- 비밀번호 재설정 성공 시 해당 member의 모든 refresh token을 폐기한다.
- v1에서는 기존 access token이 남은 TTL 동안 유효할 수 있으므로, refresh token 전체 폐기와 재로그인 유도를 최소 보안 조치로 적용한다.
- 기업회원 승인 전 로그인은 token 발급 전에 차단한다.
- OAuth callback은 state를 검증하고, provider token/userinfo 검증 실패 시 social account를 생성하지 않는다.
- `socialSignupToken`은 provider 인증 완료 후 추가정보 입력에만 사용하며 짧은 TTL과 1회 사용 정책을 가진다.
- `socialSignupToken`은 Redis에 저장한다.
- Redis key는 `user-auth:social-signup:{tokenHash}` 형식을 사용하고, raw token은 저장하지 않는다.
- Redis value에는 provider, providerUserId, providerEmail, state 검증 결과, issuedAt을 저장한다.
- TTL은 10분으로 하며, `/register/social/complete` 성공 또는 검증 실패 후 재사용 방지를 위해 key를 삭제한다.
- 인증번호는 6자리이며 `member_verifications.expires_at` 기준 5분 만료로 관리한다.
- 인증번호 재전송은 60초 제한, 인증 실패는 최대 5회로 제한한다.

---

## 10. Rate Limit 정책

- 인증번호 발송: `target + purpose` 기준 60초 재발송 제한, `expires_at` 기준 5분 만료
- 인증번호 확인: `verificationId` 기준 최대 5회 실패 허용, 초과 시 `RATE_LIMITED`
- 로그인 실패: 기존 `LoginAttemptStore` 정책 유지, 5회 실패 시 15분 `LOCKED`
- 비밀번호 reset token 발급: `loginId + IP` 기준 10분 5회 제한
- 비밀번호 재설정: `resetToken` 기준 실패 5회 또는 만료 시 재인증 필요

---

## 11. Frontend Mock 연동 주의사항

현재 `frontend/src/mocks/user/memberHandlers.ts`는 로그인, token refresh, logout, me/status 중심의 임시 mock이다.
회원가입, 인증번호, 아이디 찾기, 비밀번호 재설정 API 계약은 `frontend/src/types/user/member.ts`와 `frontend/src/api/user/member/*`를 기준으로 작성한다.

- mock의 `mock-session` cookie는 실제 backend cookie 이름이 아니다.
- 실제 backend refresh cookie는 `refreshToken`을 사용한다.
- mock의 refresh response에 `refreshToken`이 포함되어 있더라도 실제 backend spec에서는 response body에 refresh token을 포함하지 않는다.
- 백엔드 구현 완료 후 MSW mock과 실제 API 응답 구조를 동기화한다.
- 현재 프론트에는 `/register/social/complete` 페이지가 있으나 OAuth 시작/콜백 API 타입은 추가 정의가 필요하다.

---

## 12. Edge Cases

- 로그인 탭과 계정 `roleType`이 다를 때 어떻게 처리할 것인가?
- 기업회원이 `PENDING_REVIEW`, `REJECTED`, `NEEDS_REVISION` 상태로 로그인하면 token 발급 없이 어떤 안내 메시지를 반환할 것인가?
- 인증번호 발송 후 target을 변경한 경우 기존 verificationId를 어떻게 폐기할 것인가?
- 같은 `verificationToken`을 회원가입과 비밀번호 재설정에 재사용하려는 경우 어떻게 차단할 것인가?
- 아이디 찾기 결과가 여러 개인 경우 어떤 순서로 반환할 것인가?
- 비밀번호 재설정 후 기존 refresh token은 모두 폐기한다.
- 재직증명서 업로드 성공 후 기업회원 가입 실패 시 24시간 내 미사용 파일 정리 대상으로 둔다.
- Redis 장애 시 인증번호/refresh/logout 정책은 어떻게 동작해야 하는가?
- OAuth provider email이 기존 일반 회원 email과 일치할 때 자동 연결할 것인가, 별도 본인확인 후 연결할 것인가?
- social account와 기존 일반 회원 email이 충돌하는 경우 어떤 본인확인 절차로 연결할 것인가?

---

## 13. Success Criteria

- **SC-001**: 프론트 `LoginRequest`, `LoginResponse`, `TokenRefreshResponse`와 백엔드 API schema가 일치한다.
- **SC-002**: 개인/기업 회원가입 request/response가 프론트 타입과 일치한다.
- **SC-003**: refresh token body fallback이 spec에 남아 있지 않다.
- **SC-004**: 모든 API가 `ApiResponse<T>` 형식을 따른다.
- **SC-005**: 모든 예상 가능한 예외가 ErrorCode와 HTTP status로 정리되어 있다.
- **SC-006**: JWT/auth 기존 constitution과 충돌하는 보안 규칙이 없다.
- **SC-007**: Swagger docs 분리 원칙이 문서와 task에 반영되어 있다.
- **SC-008**: 승인 대기 기업회원 로그인에서 access/refresh token이 발급되지 않는다.
- **SC-009**: OAuth 로그인, 최초 소셜 가입, 기존 소셜 계정 로그인 흐름이 API schema에 분리되어 있다.

---

## 14. Assumptions

- 회원가입/찾기/재설정 API의 base path는 `/api/v1/user/members`를 유지한다.
- 실제 구현 패키지는 기존 사용자 인증 코드와의 일관성을 위해 `user/member`를 우선 사용한다.
- spec 디렉토리는 기능 의미를 명확히 하기 위해 `specs/backend/user/auth`로 둔다.
- 이메일 발송 provider는 `AWS SES`로 확정한다.
- SMS 발송 provider는 `SOLAPI / CoolSMS`로 확정한다.
- 외부 API Key, Client Secret, Service Key는 `.env` 기반 환경변수로만 주입하고 GitHub에 커밋하지 않는다.
- `member_verifications`, `password_reset_tokens`, `company_profiles`, `personal_profiles`, `hr_managers`, `social_accounts`는 `db/init.sql`의 ERD를 기준으로 한다.
- 기업회원 승인/반려 결과 메일은 admin 승인/반려 service에서 발송한다.
