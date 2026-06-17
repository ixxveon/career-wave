# Implementation Plan: 사용자 인증 기능 (Backend)

## Summary

개인회원/기업회원의 회원가입, 로그인, 소셜 로그인, 아이디 찾기, 비밀번호 재설정을 백엔드 API로 구현하기 위한 레이어 기반 계획이다.
기존 JWT 공통 인증 구현은 재사용하고, 프론트 사용자 인증 화면의 API 계약과 일치하도록 DTO, validation, ErrorCode, Swagger, 테스트를 정리한다.

---

## Technical Context

- Backend: Spring Boot, Spring Security, Spring Data JPA
- DB: PostgreSQL
- Cache/Session Store: Redis
- Auth: JWT access token + HttpOnly Cookie refresh token
- OAuth: Kakao/Naver/Google provider 인증 후 social account 연결
- Email: AWS SES
- SMS: SOLAPI / CoolSMS
- Password: BCrypt `PasswordEncoder`
- API Response: `ApiResponse<T>`
- Swagger: Controller docs interface 분리
- Frontend contract: `frontend/src/types/user/member.ts`

---

## Project Structure

실제 구현은 기존 코드와의 일관성을 위해 `user/member` 패키지를 우선 사용한다.
spec 문서는 사용자 인증 기능 의미를 분명히 하기 위해 `specs/backend/user/auth`에 둔다.

```text
backend/src/main/java/kr/co/carrer/user/member/
├── controller/
│   ├── UserAuthController.java
│   ├── UserRegisterController.java
│   ├── UserSocialAuthController.java
│   ├── UserRecoveryController.java
│   └── UserVerificationController.java
├── docs/
│   ├── UserAuthControllerDocs.java
│   ├── UserRegisterControllerDocs.java
│   ├── UserSocialAuthControllerDocs.java
│   ├── UserRecoveryControllerDocs.java
│   └── UserVerificationControllerDocs.java
├── dto/
│   ├── UserLoginDto.java
│   └── UserAuthDto.java
├── entity/
│   ├── Member.java
│   ├── PersonalProfile.java
│   ├── CompanyProfile.java
│   ├── HrManager.java
│   ├── SocialAccount.java
│   ├── MemberVerification.java
│   └── PasswordResetToken.java
├── exception/
│   └── UserAuthErrorCode.java
├── repository/
│   ├── UserMemberRepository.java
│   ├── PersonalProfileRepository.java
│   ├── CompanyProfileRepository.java
│   ├── HrManagerRepository.java
│   ├── SocialAccountRepository.java
│   ├── MemberVerificationRepository.java
│   └── PasswordResetTokenRepository.java
├── service/
│   ├── UserLoginService.java
│   ├── UserRegisterService.java
│   ├── UserSocialAuthService.java
│   ├── UserRecoveryService.java
│   ├── UserVerificationService.java
│   ├── EmailSenderPort.java
│   ├── SmsSenderPort.java
│   ├── SocialSignupTokenStore.java
│   └── impl/
├── infrastructure/
│   ├── business/
│   │   └── NtsBusinessStatusApiAdapter.java
│   ├── mail/
│   │   └── AwsSesEmailSenderAdapter.java
│   ├── sms/
│   │   └── SolapiSmsSenderAdapter.java
│   ├── social/
│   │   └── RedisSocialSignupTokenStore.java
│   └── oauth/
│       ├── KakaoOAuthClient.java
│       ├── NaverOAuthClient.java
│       └── GoogleOAuthClient.java
└── type/
    ├── MemberType.java
    ├── RoleType.java
    ├── MemberStatus.java
    ├── CompanyApprovalStatus.java
    ├── SocialProvider.java
    ├── CompanyType.java
    ├── VerificationChannel.java
    └── VerificationPurpose.java
```

---

## Architecture Decisions

| 결정 | 내용 | 근거 |
|---|---|---|
| 구현 패키지 | `user/member` 유지 | 기존 `UserAuthController`, `Member`, `UserLoginService`와 일관성 |
| spec 경로 | `specs/backend/user/auth` | 기능 의미는 사용자 인증이며 기존 JWT 공통 auth와 분리 |
| refresh token | HttpOnly Cookie only | 기존 backend auth constitution과 일치 |
| refresh response | `accessToken`만 반환 | 프론트 `TokenRefreshResponse`와 기존 backend 구현 일치 |
| verification 저장 | DB `member_verifications` | 인증번호 6자리, expires_at 5분, 재전송 60초, 실패 5회, code_hash 저장 |
| verificationToken | DB `member_verifications.verification_token` | 프론트 boolean 신뢰 금지, 서버 권위 검증 |
| password reset | DB `password_reset_tokens` | `db/init.sql` 및 기존 auth spec 기준, token hash + used_at으로 1회 사용 보장 |
| 비밀번호 변경 후 세션 | 해당 member refresh token 전체 폐기 | 탈취된 기존 세션 유지 방지, 재로그인 유도 |
| phone unique | `members.phone` unique, null 허용 | 가입/소셜 추가정보에서 phone 중복을 DB와 service에서 이중 방어 |
| 재직증명서 파일 | 최종 `company_profiles.cert_file_url/cert_file_name` 저장 | ERD 기준 컬럼 사용, 가입 전 fileId는 임시 업로드 식별자 |
| 기업회원 승인 | `hr_managers.hr_status` 기준 | 가입 신청은 `PENDING_REVIEW`, admin 승인 후 `APPROVED`일 때만 로그인 허용 |
| `companyApprovalStatus=NONE` | API 응답 전용 가상값 | 개인회원은 HR row가 없으므로 DB에 저장하지 않고 응답에서만 사용 |
| 기업 승인 메일 | admin 승인/반려 service 책임 | 메일 발송 trigger가 승인/반려 상태 변경이므로 admin domain에서 처리 |
| 기업 정보 검증 | 국세청 사업자등록정보 status API 사용 | 이번 단계는 businessNumber만으로 상태조회, validate 파라미터 미사용 |
| 주소 검색 | 이번 범위에서 한국 도로명주소 API 연동 | 기업회원 가입 주소는 직접 입력이 아니라 검색 결과 기반으로 제출 |
| 약관 저장 | `member_terms_agreements` 저장 | 필수/선택 동의 이력 관리 필요 |
| 소셜 로그인 | OAuth authorize/callback + social account 연결 | `/register/social/complete`만으로는 실제 소셜 로그인 구현 불가 |
| 소셜 저장 구조 | `social_accounts` ERD 기준 | provider + providerUserId unique 연결 정보가 필요 |
| 소셜 가입 token | Redis `user-auth:social-signup:{tokenHash}`, TTL 10분 | provider 인증 완료 후 추가정보 입력까지만 유효한 1회성 token |
| 소셜 provider 범위 | Kakao / Naver / Google | Apple 로그인 제외 |
| JPA Entity 이름 충돌 방지 | `PersonalProfile` → `@Entity(name = "UserPersonalProfile")`, `HrManager` → `@Entity(name = "UserHrManager")` | `user/dashboard/entity/PersonalProfile`, `admin/member/entity/HrManager`와 동일 클래스명으로 JPA 충돌 방지 |
| `company_profiles.address` 파생 | INSERT 시 `address = roadAddress` 값으로 채움 | DB NOT NULL 제약 충족, road_address와 의미가 같아 별도 입력 불필요 |
| 엔티티 생성 패턴 | `@NoArgsConstructor(PROTECTED)` + 정적 팩토리 | setter 없이 필수 필드를 컴파일 타임에 강제, JPA 프록시 호환 |
| 메일 발송 | AWS SES | 실제 이메일 인증/안내 메일 발송 provider 확정 |
| SMS 발송 | SOLAPI / CoolSMS | 실제 휴대폰 인증번호 발송 provider 확정 |
| 시크릿 주입 | `.env` 환경변수만 사용 | 코드 하드코딩 및 GitHub 커밋 금지 |
| Swagger | `docs` 인터페이스 분리 | 팀 convention 준수 |
| Service | interface + `impl` 구현체 | 팀 convention 준수 |

---

## Phases

- [x] Phase 1: Entity / Enum / DB 구조 정리 — PR #520
- [ ] Phase 2: Repository 구현
- [ ] Phase 3: DTO / Validation 구현
- [ ] Phase 4: Service 구현
- [ ] Phase 5: Controller / API 구현
- [ ] Phase 6: Swagger 문서화
- [ ] Phase 7: Test / 예외 케이스 검증

---

## Phase 1: Entity / Enum / DB 구조 정리

### 목표

회원가입, 인증번호, 비밀번호 재설정, 기업 재직증명서 흐름에 필요한 데이터 구조를 정의한다.

### 작업 방향

- 기존 `Member` 엔티티 필드와 제약조건을 확인한다.
- `members.role_type`은 `USER`, `COMPANY`로 저장하고 security authority에서만 `ROLE_` prefix를 붙인다.
- `members.member_status`는 `BLACKLISTED`까지 포함한다.
- 개인회원 가입 성공 시 빈 `PersonalProfile` row를 생성한다.
- `CompanyProfile`은 기업 정보와 재직증명서 최종 파일 정보만 담당한다.
- `PasswordResetToken`은 DB `password_reset_tokens` 기준으로 설계한다.
- 인증번호/verification session은 ERD `member_verifications` 기준으로 설계한다.
- 기업회원 승인 상태는 DB `hr_managers.hr_status` 기준으로 설계하며 값은 `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED`를 사용한다.
- 소셜 로그인은 ERD `social_accounts` 기준으로 provider 계정 연결을 관리한다.
- `CompanyType`, `VerificationChannel`, `VerificationPurpose`, `VerificationStatus` enum을 정의한다.
- `SocialProvider` enum 또는 허용 provider 값은 `kakao`, `naver`, `google`을 기준으로 정의한다.
- `VerificationPurpose`는 `REGISTER`, `FIND_ID`, `RESET_PASSWORD`를 사용한다.
- DB table/column 이름은 snake_case convention을 따른다.
- JPA enum은 반드시 `EnumType.STRING`을 사용한다.
- 재직증명서는 별도 테이블을 만들지 않고 최종적으로 `company_profiles.cert_file_url`, `cert_file_name`, `certificate_number`에 저장한다.

---

## Phase 2: Repository 구현

### 목표

회원가입 중복 검증, 로그인 조회, 복구 조회, token 조회에 필요한 repository method를 준비한다.

### 작업 방향

- `UserMemberRepository`
  - `findByLoginId`
  - `existsByLoginId`
  - `existsByEmail`
  - `existsByPhone`
  - `findByEmailAndRoleType`
  - `findByPhoneAndRoleType`
- `CompanyProfileRepository`
  - `existsByBusinessNumber`
  - `findByMemberId`
- `PersonalProfileRepository`
  - `save`
  - `findByMemberId`
- 기업 담당자 + 사업자번호 조회
  - `members.email` 또는 `members.phone`과 `company_profiles.business_number`를 조인하는 QueryRepository 또는 service 조회로 처리한다.
- `PasswordResetTokenRepository`
  - `findByTokenHash`
  - `existsByTokenHashAndUsedAtIsNull`
- `HrManagerRepository`
  - `findByMemberId`
  - `findByMemberIdAndHrStatus`
- `SocialAccountRepository`
  - `findByProviderAndProviderUserId`
  - `existsByProviderAndProviderUserId`
  - `existsByMemberIdAndProvider`

---

## Phase 3: DTO / Validation 구현

### 목표

프론트 타입과 일치하는 request/response DTO 및 서버 validation을 구현한다.

### 작업 방향

- `LoginRequest`, `LoginResponse`는 기존 `UserLoginDto`와 프론트 타입의 차이를 점검한다.
- 회원가입 DTO
  - `RequestPersonalRegister`
  - `ResponsePersonalRegister`
  - `RequestCompanyRegister`
  - `ResponseCompanyRegister`
  - `ResponseCheckLoginId`
  - `ResponseEmploymentCertificateUpload`
- 인증 DTO
  - `RequestSendVerification`
  - `ResponseSendVerification`
  - `RequestConfirmVerification`
  - `ResponseConfirmVerification`
- 복구 DTO
  - `RequestFindId`
  - `ResponseFindId`
  - `RequestPasswordToken`
  - `ResponsePasswordToken`
  - `RequestResetPassword`
  - `ResponseResetPassword`
- 소셜 OAuth DTO
  - `ResponseOAuthAuthorize`
  - `ResponseOAuthCallbackLogin`
  - `ResponseOAuthCallbackSignupRequired`
  - `RequestSocialComplete`
  - `ResponseSocialComplete`
- 서버 validation
  - loginId 6~20자 영문/숫자
  - password 8~64자, 영문/숫자/특수문자, loginId 포함 금지
  - phone `010` 시작 11자리
  - businessNumber 10자리
  - certificateNumber 필수
  - companyName/ceoName 필수
  - address/postalCode/roadAddress 필수, addressDetail/jibunAddress 선택
  - verification code 6자리
  - PDF MIME/size 검증
- 기업 정보 외부 검증
  - `BusinessRegistrationVerificationPort` 또는 동등 adapter 정의
  - 국세청 사업자등록정보 status API 연동
  - `businessNumber`만 사용한 상태조회 구현
  - 외부 API 장애 시 실패/수동검증 접수 정책 확정
- 주소 검색 연동
  - 프론트 주소 검색 버튼 활성화
  - 행정안전부 도로명주소 API 또는 동등한 한국 주소 API 연동
  - `postalCode`, `roadAddress`, `jibunAddress` payload 추가
- 약관 동의
  - 필수 약관 true 검증
  - 선택 마케팅 동의 기본값 false 저장
  - `member_terms_agreements` 저장 매핑 확인

---

## Phase 4: Service 구현

### 목표

비즈니스 규칙과 보안 정책을 Service 레이어에서 처리한다.

### 작업 방향

- `UserRegisterService`
  - loginId 중복 확인
  - 개인회원 가입
  - 기업회원 가입
  - 사업자등록정보 외부 API 검증
  - 기업회원 가입 신청 시 token 미발급
  - `hr_managers.hr_status=PENDING_REVIEW` 생성
  - 재직증명서 업로드 검증 및 저장
- `UserSocialAuthService`
  - OAuth authorize URL 생성
  - state 저장 및 callback 검증
  - provider token/userinfo 검증
  - 기존 소셜 계정 로그인 token 발급
  - 최초 소셜 가입용 `socialSignupToken` 발급
  - `SocialSignupTokenStore.issue(provider, providerUserId, providerEmail, state)` 호출
  - `SocialSignupTokenStore.consume(token, provider)`로 `/register/social/complete` 검증
  - callback에서는 발급만 수행하고, `/register/social/complete`에서 최종 소비/삭제를 수행
  - `socialSignupToken` Redis hash 저장, TTL 10분, 1회 사용 삭제
  - 소셜 회원가입 추가정보 완료 및 social account 연결
- `UserVerificationService`
  - 인증번호 발송
  - 인증번호 확인
  - verificationToken 발급 및 `member_verifications` 저장
  - `member_verifications` 기준 purpose/target/channel 검증
  - rate limit 처리
- `UserRecoveryService`
  - 아이디 찾기
  - loginId 마스킹
  - 비밀번호 resetToken 발급
  - 비밀번호 재설정
  - resetToken 1회 사용 처리
- 기존 `UserLoginService`
  - 로그인/refresh/logout 흐름은 기존 JWT 정책 유지
  - refresh token body fallback 금지
  - refresh response body에 refresh token 포함 금지
  - 기업회원은 `hr_managers.hr_status=APPROVED`인 경우에만 token 발급
  - `PENDING_REVIEW`, `REJECTED`, `NEEDS_REVISION`, `REMOVED` 상태는 403으로 차단
  - 비밀번호 재설정 성공 시 `RefreshTokenStore.deleteAll(accountType, memberId)`로 모든 refresh token 폐기 (개인/기업회원 모두 처리)

### Rate Limit 정책

- 인증번호 발송: `target + purpose` 기준 60초 재발송 제한, `expires_at` 기준 5분 만료
- 인증번호 확인: `verificationId` 기준 최대 5회 실패 허용
- 로그인 실패: 기존 `LoginAttemptStore` 정책 유지, 5회 실패 시 15분 `LOCKED`
- 비밀번호 reset token 발급: `loginId + IP` 기준 10분 5회 제한

---

## Phase 5: Controller / API 구현

### 목표

프론트 API client와 일치하는 endpoint를 제공한다.

### 작업 방향

- Base path: `/api/v1/user/members`
- `UserAuthController`
  - `POST /login`
  - `POST /token/refresh`
  - `POST /logout`
  - `GET /me/status`
- `UserRegisterController`
  - `GET /login-id/check`
  - `POST /register/user`
  - `POST /register/company`
  - `POST /company/employment-certificate`
- `UserSocialAuthController`
  - `GET /oauth/{provider}/authorize`
  - `GET /oauth/{provider}/callback`
  - `POST /register/social/complete`
- `UserVerificationController`
  - `POST /verifications/send`
  - `POST /verifications/confirm`
- `UserRecoveryController`
  - `POST /recovery/find-id`
  - `POST /recovery/password-token`
  - `POST /recovery/reset-password`
- 모든 응답은 `ApiResponse<T>`를 사용한다.
- Controller 내부 반복 try-catch를 작성하지 않는다.

---

## Phase 6: Swagger 문서화

### 목표

API 문서와 구현 controller를 분리하고, 프론트 연동 가능한 예시를 제공한다.

### 작업 방향

- `docs` 인터페이스에 Swagger annotation 작성
- Request/Response 예시 작성
- Error response 예시 작성
- Enum allowable values 명시
- `api-schema.md`와 Swagger 예시 불일치 여부 확인

---

## Phase 7: Test / 예외 케이스 검증

### 목표

정상/예외/보안/프론트 연동 케이스를 테스트한다.

### 작업 방향

- Service unit test
- Controller test
- Repository test
- `member_verifications` 기반 인증번호 저장/만료/시도 횟수 test
- AWS SES / SOLAPI adapter mock 또는 sandbox 통합 테스트
- 파일 업로드 validation test
- JWT refresh cookie-only flow test
- 프론트 타입과 response field 일치 여부 수동 검증

---

## Frontend Mock 전환 계획

- 현재 MSW mock은 로그인, refresh, logout, me/status 중심이다.
- 회원가입/인증/복구 API 구현 후 `frontend/src/mocks/user/memberHandlers.ts`를 실제 API schema와 맞춰 갱신한다.
- mock의 `mock-session`과 실제 `refreshToken` cookie 정책을 혼동하지 않는다.
- token refresh mock response의 `refreshToken` field는 실제 API와 맞지 않으므로 제거 대상이다.
