# Tasks: 사용자 인증 기능 (Backend)

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

---

## Phase 1 - Entity / Enum / DB 구조 정리

- [ ] 기존 `Member` 엔티티의 필드, 제약조건, UUID PK 정책을 확인한다.
- [ ] `members.role_type`은 `USER`, `COMPANY`로 저장하고 security authority에서만 `ROLE_` prefix를 붙이도록 정리한다.
- [ ] `members.member_status`에 `BLACKLISTED`를 포함한다.
- [ ] 기존 `RoleType`, `MemberStatus`, `HrStatus` enum과 QueryRepository mapping을 ERD enum 값에 맞게 갱신한다.
- [ ] 개인회원 가입 시 빈 `personal_profiles` row를 생성하도록 구조를 정리한다.
- [ ] 개인회원 가입에 필요한 `members` 필드와 unique 제약을 정리한다.
- [ ] `members.phone` unique 제약을 적용하되 null 허용 정책을 문서와 엔티티에 반영한다.
- [ ] 기업회원 가입에 필요한 `CompanyProfile` 구조를 확정한다.
- [ ] 기업회원 승인 상태는 `hr_managers.hr_status` 기준으로 관리하고 `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED` 값을 사용한다.
- [ ] `business_number` unique 제약 필요 여부를 확정한다.
- [ ] `CompanyType` enum을 프론트 `CompanyType` 값과 동일하게 정의한다.
- [ ] `VerificationChannel`, `VerificationPurpose`, `VerificationStatus` enum을 정의한다.
- [ ] `VerificationPurpose`는 `REGISTER`, `FIND_ID`, `RESET_PASSWORD`를 사용한다.
- [ ] `password_reset_tokens` 테이블 기준으로 `PasswordResetToken` 엔티티를 정의한다.
- [ ] `member_verifications` 테이블 기준으로 `MemberVerification` 엔티티를 정의한다.
- [ ] `member_verifications.verification_token` 컬럼까지 포함한 매핑을 정리한다.
- [ ] 재직증명서는 최종적으로 `company_profiles.cert_file_url`, `cert_file_name`, `certificate_number`에 저장하도록 구조를 정리한다.
- [ ] 소셜 로그인을 위한 `social_accounts` 테이블/엔티티를 ERD 기준으로 정의한다.
- [ ] `social_accounts`는 `provider + provider_user_id` unique, `member_id + provider` unique 제약을 둔다.
- [ ] `social_accounts.provider_email`은 provider 정책상 없을 수 있으므로 nullable로 둔다.
- [ ] `SocialProvider` enum 또는 provider 허용값을 `kakao`, `naver`, `google` 기준으로 정의한다.
- [ ] `Apple` provider는 enum/허용값/문서 어디에도 포함하지 않도록 정리한다.
- [ ] 모든 JPA enum 필드에 `EnumType.STRING` 사용을 명시한다.

---

## Phase 2 - Repository 구현

- [ ] `UserMemberRepository.existsByLoginId(String loginId)` 추가
- [ ] `UserMemberRepository.existsByEmail(String email)` 추가
- [ ] `UserMemberRepository.existsByPhone(String phone)` 추가
- [ ] `UserMemberRepository.findByEmailAndRoleType(...)` 또는 동등 조회 추가
- [ ] `UserMemberRepository.findByPhoneAndRoleType(...)` 또는 동등 조회 추가
- [ ] `PersonalProfileRepository.save(...)` 또는 동등 저장 흐름 추가
- [ ] `PersonalProfileRepository.findByMemberId(...)` 추가
- [ ] 기업회원 담당자/사업자번호 기반 조회 repository method 추가
- [ ] `CompanyProfileRepository.existsByBusinessNumber(String businessNumber)` 추가
- [ ] `PasswordResetTokenRepository.findByTokenHash(...)` 구현
- [ ] `MemberVerificationRepository.findByVerificationId(...)` 구현
- [ ] `MemberVerificationRepository.findByVerificationToken(...)` 구현
- [ ] `MemberVerificationRepository`에 재발송/rate limit 조회 메서드 구현
- [ ] `HrManagerRepository`에서 member 기준 승인 상태 조회 메서드 구현
- [ ] `SocialAccountRepository.findByProviderAndProviderUserId(...)` 구현
- [ ] `SocialAccountRepository.existsByProviderAndProviderUserId(...)` 구현
- [ ] `SocialAccountRepository.existsByMemberIdAndProvider(...)` 구현
- [ ] 기업회원 아이디 찾기용 `member + company_profile + hr_manager` 조회 query를 분리할지 확정한다.
- [ ] employment certificate 임시 fileId 검증 port 또는 service 구현
- [ ] 한 요청 안에서 중복 DB 조회가 발생하지 않도록 조회 흐름 점검

---

## Phase 3 - DTO / Validation 구현

- [ ] 로그인 DTO가 프론트 `LoginRequest`, `LoginResponse`와 일치하는지 점검
- [ ] token refresh response가 `accessToken`만 반환하도록 DTO 확인
- [ ] `CheckLoginIdResponse` DTO 작성
- [ ] 개인회원 가입 request/response DTO 작성
- [ ] 기업회원 가입 request/response DTO 작성
- [ ] 재직증명서 업로드 response DTO 작성
- [ ] 인증번호 발송 request/response DTO 작성
- [ ] 인증번호 확인 request/response DTO 작성
- [ ] 아이디 찾기 request/response DTO 작성
- [ ] 비밀번호 resetToken 발급 request/response DTO 작성
- [ ] 비밀번호 재설정 request/response DTO 작성
- [ ] 소셜 회원가입 추가정보 완료 request/response DTO 작성
- [ ] 소셜 OAuth authorize response DTO 작성
- [ ] 소셜 OAuth callback response DTO 작성
- [ ] OAuth provider별 callback 응답 분기 DTO를 명확히 한다: 기존 계정 로그인 / 추가정보 입력 필요
- [ ] `socialSignupToken` 필드가 프론트 타입에 추가되어야 함을 API 계약에 반영
- [ ] `companyApprovalStatus=NONE`은 개인회원 응답 전용 가상값이며 DB에 저장하지 않는다는 API 계약을 반영
- [ ] loginId validation: 영문/숫자 6~20자
- [ ] password validation: 8~64자, 영문/숫자/특수문자, loginId 포함 금지
- [ ] email validation 추가
- [ ] phone normalization 및 `010` 시작 11자리 검증 추가
- [ ] businessNumber normalization 및 10자리 검증 추가
- [ ] certificateNumber 필수 검증 추가
- [ ] companyName, ceoName 필수 검증 추가
- [x] postalCode/roadAddress 필수, addressDetail/jibunAddress 선택 검증 추가 — `validateCompanyRegisterForm()` 반영 완료
- [x] `CompanyRegisterRequest`에 `certificateNumber`, `postalCode`, `roadAddress`, `jibunAddress` 필드 추가 — 프론트 타입 및 payload mapping 완료
- [ ] verification code 6자리 숫자 검증 추가
- [ ] verification target이 EMAIL일 때 이메일 형식 검증 추가
- [ ] verification target이 PHONE일 때 한국 휴대폰 번호 형식 검증 추가
- [ ] verification purpose별 허용 target 조합을 문서화한다.
- [ ] 개인회원 회원가입 이메일 인증 purpose를 `REGISTER`로 고정한다.
- [ ] 개인회원 회원가입 휴대폰 인증 purpose를 `REGISTER`로 고정한다.
- [ ] 기업회원 담당자 이메일/휴대폰 인증 purpose를 `REGISTER`로 고정한다.
- [ ] 소셜 추가정보 완료의 휴대폰 인증 purpose를 `REGISTER`로 고정한다.
- [ ] 이번 범위에서는 `PHONE_VERIFY` purpose를 사용하지 않음을 문서와 구현에 동일 적용한다.
- [ ] PDF MIME type, 확장자, 5MB 이하 검증 추가
- [ ] 외부 API/provider 설정은 환경변수 참조 방식으로만 사용한다고 DTO/API 계약에 반영
- [ ] AWS SES 관련 환경변수 목록을 문서화한다.
- [ ] SOLAPI / CoolSMS 관련 환경변수 목록을 문서화한다.
- [ ] Kakao/Naver/Google OAuth 환경변수 목록을 문서화한다.
- [ ] 국세청 사업자 상태조회 API 환경변수 목록을 문서화한다.
- [ ] DTO 필드에 Swagger `@Schema` 설명 추가
- [ ] Enum field의 Swagger allowable values 정리

---

## Phase 4 - Service 구현

- [ ] `UserRegisterService` 인터페이스 작성
- [ ] `UserRegisterServiceImpl` 작성
- [ ] loginId 중복 확인 service 구현
- [ ] 개인회원 가입 service 구현
- [ ] 개인회원 가입 성공 시 `personal_profiles` 빈 row 생성 구현
- [ ] 기업회원 가입 service 구현
- [ ] 기업회원 가입 시 access token/refresh token을 발급하지 않는 신청 접수 흐름 구현
- [ ] 기업회원 가입 시 `hr_managers.hr_status=PENDING_REVIEW` 신청 레코드 생성
- [ ] 승인 전/반려/보완 요청 기업회원 로그인 시 token 발급 전 403 차단
- [ ] admin 승인 완료 후에만 기업회원 로그인 성공 허용
- [ ] 기존 `UserMemberStatusQueryRepository`의 `hr_status` → `CompanyApprovalStatus` mapping을 신규 값 기준으로 수정
- [ ] 최종 가입 시점에 loginId/email/phone/businessNumber 중복 재검증
- [ ] 비밀번호 BCrypt hash 저장
- [ ] 필수 약관 동의 검증
- [ ] 선택 약관 `marketing=false` 기본값 및 저장 매핑 구현
- [ ] `member_terms_agreements`에 service/privacy/marketing/companyVerification/sms 동의값 저장
- [ ] 개인회원 가입 시 `member_terms_agreements.company_verification_agreed`, `sms_agreed`는 `null`로 저장
- [ ] 기업회원 가입 시 `member_terms_agreements.company_verification_agreed=true`, `sms_agreed=true`를 필수 검증
- [ ] 프론트 `age` 동의는 API request에 포함하지 않고, 백엔드는 `service/privacy` 필수 약관만 검증하도록 명시
- [ ] 재직증명서 fileId 유효성 검증
- [ ] `BusinessRegistrationVerificationPort` 또는 동등 외부 API adapter 작성
- [ ] 국세청 status API request/response DTO 작성
- [ ] 국세청 사업자등록정보 status API를 `businessNumber`만으로 호출하는 service 구현
- [ ] status API 응답에서 정상/휴업/폐업 판정 규칙을 구현한다.
- [ ] status API timeout / 4xx / 5xx / 빈 응답을 `UserAuthErrorCode`로 매핑한다.
- [ ] businessNumber normalize 후 외부 API를 호출하도록 구현한다.
- [ ] 외부 사업자 검증 실패/장애 ErrorCode 구현
- [x] 프론트 기업회원 가입 주소 검색 버튼 활성화 — `CompanyRegisterForm.tsx` "주소 검색" 버튼 활성화 완료
- [x] Kakao(Daum) 우편번호 서비스 연동 — `handleAddressSearch()` 구현, 별도 API Key 불필요
- [x] 주소 검색 결과를 `postalCode`, `roadAddress`, `jibunAddress`로 가입 payload에 매핑 — `CompanyRegisterRequest` 타입 및 `toCompanyRegisterRequest()` 완료
- [ ] 백엔드 기업회원 가입 service에서 `company_profiles.address` 컬럼을 `roadAddress` 값으로 채워 INSERT
- [ ] `UserSocialAuthService` 인터페이스 작성
- [ ] OAuth authorize URL 생성 및 state 저장 구현
- [ ] OAuth state를 Redis에 저장하는 구조(key, value, TTL)를 확정하고 구현한다.
- [ ] OAuth authorize 단계에서 provider별 redirect URI 조합 구현
- [ ] Kakao authorize URL 생성 구현
- [ ] Naver authorize URL 생성 구현
- [ ] Google authorize URL 생성 구현
- [ ] OAuth callback에서 state 검증, provider token 교환, provider userinfo 검증 구현
- [ ] Kakao token endpoint 호출 구현
- [ ] Naver token endpoint 호출 구현
- [ ] Google token endpoint 호출 구현
- [ ] Kakao userinfo 조회 및 `providerUserId` 추출 구현
- [ ] Naver userinfo 조회 및 `providerUserId` 추출 구현
- [ ] Google userinfo 조회 및 `providerUserId` 추출 구현
- [ ] Kakao email nullable 처리 구현
- [ ] Naver email nullable 처리 구현
- [ ] Google email nullable 처리 구현
- [ ] OAuth callback 성공 후 state 삭제 처리
- [ ] 기존 social account 로그인 시 access token과 refresh cookie 발급 구현
- [ ] 최초 소셜 사용자에게 `socialSignupToken` 발급 구현
- [ ] OAuth callback에서 최초 소셜 사용자인 경우 `SocialSignupTokenStore.issue(provider, providerUserId, providerEmail, state)` 호출 구현
- [ ] `socialSignupToken`은 Redis `user-auth:social-signup:{tokenHash}`에 raw token 없이 저장
- [ ] `socialSignupToken` Redis value 구조를 확정한다: `provider`, `providerUserId`, `providerEmail`, `issuedAt`, `expiresAt`
- [ ] 소셜 회원가입 추가정보 완료 service 구현
- [ ] `/register/social/complete`에서 `SocialSignupTokenStore.consume(token, provider)` 검증 구현
- [ ] `socialSignupToken` TTL/1회 사용 검증 구현
- [ ] `socialSignupToken` TTL은 10분으로 설정하고 성공/실패 후 재사용되지 않도록 삭제 처리
- [ ] `socialSignupToken`과 request `provider` 불일치 시 `SOCIAL_SIGNUP_TOKEN_INVALID` 처리 구현
- [ ] `socialSignupToken`으로 꺼낸 `providerUserId`를 기준으로 `social_accounts` 연결/생성 구현
- [ ] `UserVerificationService` 인터페이스 작성
- [ ] `EmailSenderPort` 인터페이스 작성
- [ ] `SmsSenderPort` 인터페이스 작성
- [ ] `SocialSignupTokenStore` 인터페이스 작성
- [ ] `AwsSesEmailSenderAdapter` 구현
- [ ] `SolapiSmsSenderAdapter` 구현
- [ ] `RedisSocialSignupTokenStore` 구현
- [ ] AWS SES 이메일 제목 템플릿 작성
- [ ] AWS SES 이메일 본문 템플릿 작성
- [ ] SOLAPI / CoolSMS SMS 본문 템플릿 작성
- [ ] AWS SES sandbox 환경에서 검증된 이메일만 발송 가능함을 고려한 예외 처리 구현
- [ ] SOLAPI / CoolSMS 요청 payload 구성 구현
- [ ] SOLAPI / CoolSMS 응답 파싱 및 실패 코드 매핑 구현
- [ ] 외부 API/Secret은 환경변수 기반으로만 주입하고 코드 하드코딩을 금지
- [ ] 인증번호 발송 service 구현
- [ ] 인증번호 확인 service 구현
- [ ] verificationToken 발급 구현
- [ ] 6자리 랜덤 인증번호 생성기 구현
- [ ] 인증번호 `codeHash` 생성 구현
- [ ] 인증번호 발송 시 `member_verifications` row 생성 구현
- [ ] `expires_at` 5분, `resend_available_at` 60초 저장 구현
- [ ] 인증 성공 시 `verification_status=VERIFIED`, `verified_at` 저장 구현
- [ ] 인증 실패 시 `remaining_attempts` 감소 및 `verification_status` 갱신 구현
- [ ] verificationToken을 `member_verifications.verification_token`에 저장하고 조회하는 구현
- [ ] verificationToken purpose/target/channel/expiry/verificationStatus 검증 구현
- [ ] 인증번호 발송 rate limit 구현: `target + purpose` 기준 60초 재발송 제한, `expires_at` 기준 5분 만료
- [ ] 인증번호 확인 rate limit 구현: `verificationId` 기준 최대 5회 실패 허용
- [ ] `UserRecoveryService` 인터페이스 작성
- [ ] 개인회원 아이디 찾기 구현
- [ ] 기업회원 아이디 찾기 구현
- [ ] loginId masking 구현
- [ ] 비밀번호 resetToken 발급 구현
- [ ] resetToken hash 저장 및 1회 사용 처리
- [ ] 비밀번호 재설정 구현
- [ ] 비밀번호 재설정 후 해당 member의 모든 refresh token 폐기 구현
- [ ] 모든 예상 가능한 예외를 `CustomException + UserAuthErrorCode`로 처리
- [ ] 로그인/찾기/재설정 실패 메시지가 계정 존재 여부를 노출하지 않는지 확인

---

## Phase 5 - Controller / API 구현

- [ ] `UserAuthController` 기존 login/refresh/logout/me/status 계약 재확인
- [ ] `POST /api/v1/user/members/login` response가 프론트 `LoginResponse`와 일치하는지 확인
- [ ] `POST /api/v1/user/members/token/refresh`가 body 없이 cookie만 사용하는지 확인
- [ ] `POST /api/v1/user/members/token/refresh` response body에 refresh token이 없는지 확인
- [ ] `UserRegisterController` 작성
- [ ] `GET /api/v1/user/members/login-id/check` 구현
- [ ] `POST /api/v1/user/members/register/user` 구현
- [ ] `POST /api/v1/user/members/register/company` 구현
- [ ] `POST /api/v1/user/members/company/employment-certificate` 구현
- [ ] `GET /api/v1/user/members/oauth/{provider}/authorize` 구현
- [ ] `GET /api/v1/user/members/oauth/{provider}/callback` 구현
- [ ] `POST /api/v1/user/members/register/social/complete` 구현
- [ ] OAuth callback 성공 시 프론트로 redirect할지 JSON으로 응답할지 정책을 확정하고 구현
- [ ] `UserVerificationController` 작성
- [ ] `POST /api/v1/user/members/verifications/send` 구현
- [ ] `POST /api/v1/user/members/verifications/confirm` 구현
- [ ] `UserRecoveryController` 작성
- [ ] `POST /api/v1/user/members/recovery/find-id` 구현
- [ ] `POST /api/v1/user/members/recovery/password-token` 구현
- [ ] `POST /api/v1/user/members/recovery/reset-password` 구현
- [ ] 모든 controller response가 `ApiResponse<T>`인지 확인
- [ ] Controller에서 직접 `Map` 반환이 없는지 확인
- [ ] Controller에서 반복 try-catch가 없는지 확인
- [ ] SecurityConfig permitAll 목록에 public API가 반영되었는지 확인
- [ ] OAuth authorize/callback/register social complete API가 permitAll인지 확인

---

## Phase 6 - Swagger 문서화

- [ ] `UserAuthControllerDocs` 기존 문서와 실제 response 불일치 점검
- [ ] `UserRegisterControllerDocs` 작성
- [ ] `UserVerificationControllerDocs` 작성
- [ ] `UserRecoveryControllerDocs` 작성
- [ ] 회원가입 request/response 예시 작성
- [ ] 인증번호 발송/확인 request/response 예시 작성
- [ ] AWS SES / SOLAPI 실제 provider 사용 조건 및 sandbox 제약 설명 작성
- [ ] OAuth provider별 authorize/callback 예시 작성
- [ ] 아이디 찾기 request/response 예시 작성
- [ ] 비밀번호 재설정 request/response 예시 작성
- [ ] token refresh cookie-only 설명 작성
- [ ] Error response 예시 작성
- [ ] Swagger enum allowable values 작성
- [ ] Controller에 Swagger annotation이 직접 과도하게 작성되지 않았는지 확인
- [ ] `api-schema.md`와 Swagger 예시가 일치하는지 확인

---

## Phase 7 - Test / 예외 케이스 검증

- [ ] login 성공 테스트
- [ ] login roleType 불일치 테스트
- [ ] login 비밀번호 불일치 테스트
- [ ] login 잠금/정지/탈퇴 계정 테스트
- [ ] refresh cookie 없음 테스트
- [ ] refresh response에 refreshToken이 없는지 테스트
- [ ] logout cookie 삭제 및 blacklist 등록 테스트
- [ ] loginId 중복 확인 성공/실패 테스트
- [ ] 개인회원 가입 성공 테스트
- [ ] 개인회원 가입 성공 시 `personal_profiles` 빈 row 생성 테스트
- [ ] 개인회원 가입 시 `company_verification_agreed`, `sms_agreed`가 `null`로 저장되는지 테스트
- [ ] 개인회원 login/me/status 응답에서 `companyApprovalStatus=NONE`이 반환되고 DB에 저장되지 않는지 테스트
- [ ] 기업회원 가입 성공 테스트
- [ ] 기업회원 가입 성공 후 token이 발급되지 않는지 테스트
- [ ] 기업회원 사업자등록정보 외부 검증 성공/실패 테스트
- [ ] 기업회원 외부 검증 API 장애 테스트
- [ ] 기업회원 약관 동의 저장 테스트
- [ ] 승인 대기 기업회원 로그인 403 및 token 미발급 테스트
- [ ] 승인 완료 기업회원 로그인 성공 테스트
- [ ] loginId/email/phone/businessNumber 중복 테스트
- [ ] 필수 약관 미동의 테스트
- [ ] 비밀번호 정책 위반 테스트
- [ ] verificationToken 없음/만료/purpose 불일치 테스트
- [ ] 인증번호 발송 성공 테스트
- [ ] 인증번호 확인 성공 테스트
- [ ] 인증번호 오입력/만료/시도 횟수 초과 테스트
- [ ] `member_verifications.expires_at` 5분 만료 테스트
- [ ] 인증번호 재전송 60초 제한 테스트
- [ ] 인증번호 5회 실패 후 차단 테스트
- [ ] AWS SES sandbox 또는 mock 기반 이메일 발송 테스트
- [ ] SOLAPI / CoolSMS mock 기반 SMS 발송 테스트
- [ ] 개인회원 아이디 찾기 성공 테스트
- [ ] 기업회원 아이디 찾기 성공 테스트
- [ ] 아이디 찾기 결과 없음 `found=false` 테스트
- [ ] loginId masking 테스트
- [ ] password resetToken 발급 테스트
- [ ] resetToken 만료/재사용 차단 테스트
- [ ] 비밀번호 재설정 성공 테스트
- [ ] 비밀번호 재설정 후 refresh token 전체 폐기 테스트
- [ ] OAuth state 불일치 실패 테스트
- [ ] OAuth state TTL 만료 테스트
- [ ] 기존 소셜 계정 로그인 성공 테스트
- [ ] `provider + providerUserId` 기준 계정 연결 테스트
- [ ] Kakao email 없음 테스트
- [ ] Naver email 없음/있음 테스트
- [ ] Google email 없음/있음 테스트
- [ ] 최초 소셜 계정 callback 시 `socialSignupToken` 발급 테스트
- [ ] `socialSignupToken` Redis TTL 10분 및 raw token 미저장 테스트
- [ ] `socialSignupToken` 만료/재사용 차단 테스트
- [ ] `socialSignupToken`과 provider 불일치 시 `SOCIAL_SIGNUP_TOKEN_INVALID` 테스트
- [ ] 소셜 회원가입 추가정보 완료 성공/실패 테스트
- [ ] 재직증명서 PDF 업로드 성공 테스트
- [ ] PDF 아님/MIME 불일치/5MB 초과 테스트
- [ ] 프론트 `types/user/member.ts`와 response field 수동 대조
- [ ] MSW mock 갱신 필요 항목 정리
