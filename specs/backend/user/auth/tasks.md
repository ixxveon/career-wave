# Tasks: 사용자 인증 기능 (Backend)

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

---

## Phase 1 - Entity / Enum / DB 구조 정리

- [x] 기존 `Member` 엔티티의 필드, 제약조건, UUID PK 정책을 확인한다. — `@Getter` · `@NoArgsConstructor(PROTECTED)` Lombok 적용, `@PrePersist` UUID 자동 생성 확인
- [x] `members.role_type`은 `USER`, `COMPANY`로 저장하고 security authority에서만 `ROLE_` prefix를 붙이도록 정리한다.
- [x] `members.member_status`에 `BLACKLISTED`를 포함한다. — `MemberStatus` enum에 반영 완료 (docs PR #488)
- [x] 기존 `RoleType`, `MemberStatus`, `HrStatus` enum과 QueryRepository mapping을 ERD enum 값에 맞게 갱신한다. — admin `HrStatus` `PENDING→PENDING_REVIEW`, `ACTIVE→APPROVED`, `reject()→REJECTED` 수정
- [x] 개인회원 가입 시 빈 `personal_profiles` row를 생성하도록 구조를 정리한다. — `PersonalProfile.emptyFor(UUID)` 정적 팩토리 추가
- [x] 개인회원 가입에 필요한 `members` 필드와 unique 제약을 정리한다.
- [x] `members.phone` unique 제약을 적용하되 null 허용 정책을 문서와 엔티티에 반영한다. — `@Column(unique = true)`, nullable 유지 (docs PR #488)
- [x] 기업회원 가입에 필요한 `CompanyProfile` 구조를 확정한다. — user 도메인 `CompanyProfile` 엔티티 추가, `@Entity(name = "UserCompanyProfile")`로 admin 엔티티와 분리
- [x] 기업회원 승인 상태는 `hr_managers.hr_status` 기준으로 관리하고 `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED` 값을 사용한다. — `HrStatus` enum 정의, admin enum도 동기화
- [x] `business_number` unique 제약 필요 여부를 확정한다. — ERD `uq_business_number` 기준 필요, `@Table(uniqueConstraints)` 반영
- [x] `CompanyType` enum을 프론트 `CompanyType` 값과 동일하게 정의한다. — 10개 값 일치 확인
- [x] `VerificationChannel`, `VerificationPurpose`, `VerificationStatus` enum을 정의한다.
- [x] `VerificationPurpose`는 `REGISTER`, `FIND_ID`, `RESET_PASSWORD`를 사용한다.
- [x] `password_reset_tokens` 테이블 기준으로 `PasswordResetToken` 엔티티를 정의한다. — `create()` 팩토리, `markUsed()` 상태 메서드, `token_hash` unique constraint, `isExpired()` 경계 포함(`!isBefore`)
- [x] `member_verifications` 테이블 기준으로 `MemberVerification` 엔티티를 정의한다. — `issue()` 팩토리, `markVerified()` null/blank 즉시 실패, `verification_token` unique constraint, `decrementAttempts()` · `expire()`
- [x] `member_verifications.verification_token` 컬럼까지 포함한 매핑을 정리한다.
- [x] 재직증명서는 최종적으로 `company_profiles.cert_file_url`, `cert_file_name`, `certificate_number`에 저장하도록 구조를 정리한다. — `CompanyProfile` 엔티티에 모두 `NOT NULL` 반영
- [x] 소셜 로그인을 위한 `social_accounts` 테이블/엔티티를 ERD 기준으로 정의한다. — `link()` 팩토리
- [x] `social_accounts`는 `provider + provider_user_id` unique, `member_id + provider` unique 제약을 둔다. — `@Table(uniqueConstraints)` 반영
- [x] `social_accounts.provider_email`은 provider 정책상 없을 수 있으므로 nullable로 둔다.
- [x] `SocialProvider` enum 또는 provider 허용값을 `kakao`, `naver`, `google` 기준으로 정의한다. — `SocialProvider` enum: KAKAO · NAVER · GOOGLE
- [x] `Apple` provider는 enum/허용값/문서 어디에도 포함하지 않도록 정리한다.
- [x] 모든 JPA enum 필드에 `EnumType.STRING` 사용을 명시한다.

---

## Phase 2 - Repository 구현

- [x] `UserMemberRepository.existsByLoginId(String loginId)` 추가
- [x] `UserMemberRepository.existsByEmail(String email)` 추가
- [x] `UserMemberRepository.existsByPhone(String phone)` 추가
- [x] `UserMemberRepository.findByEmailAndRoleType(...)` 또는 동등 조회 추가
- [x] `UserMemberRepository.findByPhoneAndRoleType(...)` 또는 동등 조회 추가
- [x] `PersonalProfileRepository.save(...)` 또는 동등 저장 흐름 추가 — `JpaRepository.save()` 기본 제공으로 충족
- [x] `PersonalProfileRepository.findByMemberId(...)` 추가
- [x] 기업회원 담당자/사업자번호 기반 조회 repository method 추가 — `UserMemberQueryRepository` 신규 추가. JOIN: `members JOIN company_profiles JOIN hr_managers ON h.company_profile_id = cp.company_profile_id`. 조건: `managerName + businessNumber + email/phone + role_type = 'COMPANY'`
- [x] `CompanyProfileRepository.existsByBusinessNumber(String businessNumber)` 추가
- [x] `PasswordResetTokenRepository.findByTokenHash(...)` 구현 — `existsByMemberIdAndUsedAtIsNullAndExpiresAtAfter(UUID memberId, Instant now)` 추가 (중복 발급 방지)
- [x] `MemberVerificationRepository.findByVerificationId(...)` 구현 — 명시적 메서드 추가 (JpaRepository.findById와 동등, service 호출 일관성 목적)
- [x] `MemberVerificationRepository.findByVerificationToken(...)` 구현
- [x] `MemberVerificationRepository`에 재발송/rate limit 조회 메서드 구현 — `findTopByTargetAndPurposeOrderByCreatedAtDesc` 추가
- [x] `UserHrManagerRepository`에서 member 기준 승인 상태 조회 메서드 구현 — `findByMemberId`, `findByMemberIdAndHrStatus` (bean 충돌로 HrManagerRepository → UserHrManagerRepository 리네임)
- [x] `SocialAccountRepository.findByProviderAndProviderUserId(...)` 구현
- [x] `SocialAccountRepository.existsByProviderAndProviderUserId(...)` 구현
- [x] `SocialAccountRepository.existsByMemberIdAndProvider(...)` 구현
- [x] 기업회원 아이디 찾기용 `member + company_profile + hr_manager` 조회 query를 분리할지 확정한다. — `UserMemberQueryRepository`로 분리. `members JOIN company_profiles JOIN hr_managers`. 조건: `m.name(managerName)` + `cp.business_number` + `m.email 또는 m.phone` + `m.role_type = 'COMPANY'`. hr_status 필터 미적용 (아이디 찾기는 로그인 자격 검증 아님, spec FR-011).
- [x] employment certificate 임시 fileId 검증 port 또는 service 구현 — `EmploymentCertificateFilePort` + `StubEmploymentCertificateFileAdapter`(@Profile({"local","test"})) 구현 완료, Phase 5에서 S3 실제 검증으로 교체 예정
- [x] 한 요청 안에서 중복 DB 조회가 발생하지 않도록 조회 흐름 점검 — DB 중복 조회 없음 확인. 단 registerCompany()에서 S3 headObject 이중 호출(validate + resolveFileName) 발견 — 네트워크 최적화는 별도 PR

---

## Phase 3 - DTO / Validation 구현

- [x] 로그인 DTO가 프론트 `LoginRequest`, `LoginResponse`와 일치하는지 점검 — 기존 `UserLoginDto` 일치 확인
- [x] token refresh response가 `accessToken`만 반환하도록 DTO 확인 — `TokenRefreshResponse(accessToken)` 확인
- [x] `CheckLoginIdResponse` DTO 작성 — `UserRegisterDto.ResponseCheckLoginId`
- [x] 개인회원 가입 request/response DTO 작성 — `RequestPersonalRegister` / `ResponsePersonalRegister`
- [x] 기업회원 가입 request/response DTO 작성 — `RequestCompanyRegister` / `ResponseCompanyRegister`
- [x] 재직증명서 업로드 response DTO 작성 — `ResponseEmploymentCertificateUpload`
- [x] 인증번호 발송 request/response DTO 작성 — `UserVerificationDto.RequestSendVerification` / `ResponseSendVerification`
- [x] 인증번호 확인 request/response DTO 작성 — `RequestConfirmVerification` / `ResponseConfirmVerification`
- [x] 아이디 찾기 request/response DTO 작성 — `UserRecoveryDto.RequestFindId` / `ResponseFindId`
- [x] 비밀번호 resetToken 발급 request/response DTO 작성 — `RequestPasswordToken` / `ResponsePasswordToken`
- [x] 비밀번호 재설정 request/response DTO 작성 — `RequestResetPassword` / `ResponseResetPassword`
- [x] 소셜 회원가입 추가정보 완료 request/response DTO 작성 — `UserSocialAuthDto.RequestSocialComplete` / `ResponseSocialComplete`
- [x] 소셜 OAuth authorize response DTO 작성 — `ResponseOAuthAuthorize`
- [x] 소셜 OAuth callback response DTO 작성 — `ResponseOAuthCallbackLogin` / `ResponseOAuthCallbackSignupRequired`
- [x] OAuth provider별 callback 응답 분기 DTO를 명확히 한다: 기존 계정 로그인 / 추가정보 입력 필요 — 두 record로 분리
- [x] `socialSignupToken` 필드가 프론트 타입에 추가되어야 함을 API 계약에 반영 — `RequestSocialComplete`에 포함, 프론트 타입 추후 동기화
- [x] `companyApprovalStatus=NONE`은 개인회원 응답 전용 가상값이며 DB에 저장하지 않는다는 API 계약을 반영 — DTO 주석 명시
- [x] loginId validation: 영문/숫자 6~20자 — `@Pattern(regexp = "^[A-Za-z0-9]{6,20}$")`
- [x] password validation: 8~64자, 영문/숫자/특수문자, loginId 포함 금지 — `@ValidPassword` (loginId 포함 금지는 service 레이어)
- [x] email validation 추가 — `@Email`
- [x] phone `010` 시작 11자리 순수 숫자 검증 추가 — `@Pattern(regexp = "^010[0-9]{8}$")` (프론트가 정규화된 값 전달 전제; 하이픈 포함 입력 normalize는 미구현 — service 레이어 필요 시 추가)
- [x] businessNumber 10자리 순수 숫자 검증 추가 — `@Pattern(regexp = "^[0-9]{10}$")` (동일 전제)
- [x] certificateNumber 필수 검증 추가 — `@NotBlank`
- [x] companyName, ceoName 필수 검증 추가 — `@NotBlank`
- [x] postalCode/roadAddress 필수, addressDetail/jibunAddress 선택 검증 추가 — `validateCompanyRegisterForm()` 반영 완료
- [x] `CompanyRegisterRequest`에 `certificateNumber`, `postalCode`, `roadAddress`, `jibunAddress` 필드 추가 — 프론트 타입 및 payload mapping 완료
- [x] verification code 6자리 숫자 검증 추가 — `@Pattern(regexp = "^[0-9]{6}$")`

---

## Phase 4 - Service 구현
> **완료 기준**: Service 로직 + Service 단위 테스트 동시 완성. (Phase 7의 Service 단위 테스트 항목은 Phase 4로 귀속. Phase 7은 통합/E2E 테스트 전담)

- [x] `EmploymentCertificateFilePort` 인터페이스 정의 + `StubEmploymentCertificateFileAdapter` 구현 — Phase 4 완료 (Phase 5에서 S3 실제 구현체로 교체)
- [x] 기업회원 가입 Service에서 fileId 검증 Port 호출 구조 구현 — validate() → memberRepository.save() 순서 보장
- [x] fileId port 실패 시 회원/기업 정보 미저장 단위 테스트 추가
- [x] 외부 API/provider 설정은 환경변수 참조 방식으로만 사용 — application.properties + .env.example 갱신
- [x] AWS SES 관련 환경변수 목록을 문서화한다. — AWS_ACCESS_KEY_ID·SECRET·REGION·SES_FROM_EMAIL
- [x] SOLAPI / CoolSMS 관련 환경변수 목록을 문서화한다. — SOLAPI_API_KEY·API_SECRET·SENDER_PHONE
- [x] Kakao/Naver/Google OAuth 환경변수 목록을 문서화한다. — {PROVIDER}_CLIENT_ID·CLIENT_SECRET·REDIRECT_URI
- [x] 국세청 사업자 상태조회 API 환경변수 목록을 문서화한다. — PUBLIC_DATA_NTS_SERVICE_KEY·NTS_BUSINESS_API_BASE_URL
- [x] verification target이 EMAIL일 때 이메일 형식 검증 추가 — UserVerificationServiceImpl.validateTarget()
- [x] verification target이 PHONE일 때 한국 휴대폰 번호 형식 검증 추가 — ^010[0-9]{8}$ 패턴
- [x] verification purpose별 허용 target 조합을 문서화한다.
- [x] 개인회원 회원가입 이메일/휴대폰 인증 purpose를 REGISTER로 고정한다.
- [x] 기업회원 담당자 이메일/휴대폰 인증 purpose를 REGISTER로 고정한다.
- [x] 소셜 추가정보 완료의 휴대폰 인증 purpose를 REGISTER로 고정한다.
- [x] 이번 범위에서는 PHONE_VERIFY purpose를 사용하지 않음을 구현에 동일 적용한다.
- [x] UserRegisterService 인터페이스 작성
- [x] UserRegisterServiceImpl 작성
- [x] loginId 중복 확인 service 구현
- [x] 개인회원 가입 service 구현
- [x] 개인회원 가입 성공 시 personal_profiles 빈 row 생성 구현
- [x] 기업회원 가입 service 구현
- [x] 기업회원 가입 시 access token/refresh token 미발급 신청 접수 흐름 구현
- [x] 기업회원 가입 시 hr_managers.hr_status=PENDING_REVIEW 신청 레코드 생성
- [x] 승인 전/반려/보완 요청 기업회원 로그인 시 token 발급 전 403 차단 — Phase 3에서 처리
- [x] admin 승인 완료 후에만 기업회원 로그인 성공 허용 — 동일
- [x] UserMemberStatusQueryRepository hr_status → CompanyApprovalStatus mapping 신규 값 기준 수정 — Phase 1 처리
- [x] 최종 가입 시점에 loginId/email/phone/businessNumber 중복 재검증
- [x] 비밀번호 BCrypt hash 저장
- [x] 필수 약관 동의 검증 — @AssertTrue(DTO) + terms.service/privacy 필수
- [x] 선택 약관 marketing=false 기본값 및 저장 매핑 구현
- [x] member_terms_agreements에 service/privacy/marketing/companyVerification/sms 동의값 저장
- [x] 개인회원 가입 시 company_verification_agreed, sms_agreed는 null로 저장
- [x] 기업회원 가입 시 company_verification_agreed=true, sms_agreed=true를 필수 검증
- [x] 프론트 age 동의는 API request에 포함하지 않고 백엔드는 service/privacy 필수 약관만 검증
- [x] 재직증명서 fileId 검증 Port·Service 호출 구조 구현 완료 — 실제 S3 객체 존재·MIME·크기 검증은 Phase 5에서 처리
- [x] BusinessRegistrationVerificationPort 작성 — NtsBusinessStatusApiAdapter
- [x] 국세청 status API request/response DTO 작성 — NtsBusinessStatusApiAdapter 내부 record
- [x] 국세청 사업자등록정보 status API를 businessNumber만으로 호출하는 service 구현
- [x] status API 응답에서 정상/휴업/폐업 판정 규칙을 구현한다. — b_stt_cd=01만 정상
- [x] status API timeout/4xx/5xx/빈 응답을 UserAuthErrorCode로 매핑한다.
- [x] businessNumber normalize 후 외부 API를 호출하도록 구현한다.
- [x] 외부 사업자 검증 실패/장애 ErrorCode 구현
- [x] 프론트 기업회원 가입 주소 검색 버튼 활성화 — CompanyRegisterForm.tsx 완료
- [x] Kakao(Daum) 우편번호 서비스 연동 — handleAddressSearch() 구현, 별도 API Key 불필요
- [x] 주소 검색 결과를 postalCode/roadAddress/jibunAddress로 가입 payload에 매핑 완료
- [x] 백엔드 기업회원 가입 service에서 company_profiles.address = roadAddress 값으로 INSERT
- [x] UserSocialAuthService 인터페이스 작성
- [x] OAuth authorize URL 생성 및 state 저장 구현 — oauth:state:{state}, TTL 10분
- [x] OAuth state를 Redis에 저장하는 구조(key, value, TTL)를 확정하고 구현한다.
- [x] OAuth authorize 단계에서 provider별 redirect URI 조합 구현
- [x] Kakao/Naver/Google authorize URL 생성 구현
- [x] OAuth callback에서 state 검증, provider token 교환, provider userinfo 검증 구현
- [x] Kakao/Naver/Google token endpoint 호출 구현
- [x] Kakao/Naver/Google userinfo 조회 및 providerUserId 추출 구현
- [x] Kakao/Naver/Google email nullable 처리 구현
- [x] OAuth callback 성공 후 state 삭제 처리
- [x] 기존 social account 로그인 시 access token과 refresh cookie 발급 구현
- [x] 최초 소셜 사용자에게 socialSignupToken 발급 구현
- [x] SocialSignupTokenStore.issue() 호출 구현
- [x] socialSignupToken은 Redis user-auth:social-signup:{tokenHash}에 raw token 없이 저장
- [x] socialSignupToken Redis value 구조 확정: provider·providerUserId·providerEmail
- [x] 소셜 회원가입 추가정보 완료 service 구현
- [x] /register/social/complete에서 SocialSignupTokenStore.consume() 검증 구현
- [x] socialSignupToken TTL/1회 사용 검증 구현
- [x] socialSignupToken과 request provider 불일치 시 SOCIAL_SIGNUP_TOKEN_INVALID 처리 구현
- [x] socialSignupToken으로 꺼낸 providerUserId를 기준으로 social_accounts 연결/생성 구현
- [x] UserVerificationService 인터페이스 작성
- [x] EmailSenderPort/SmsSenderPort/SocialSignupTokenStore 인터페이스 작성
- [x] AwsSesEmailSenderAdapter/SolapiSmsSenderAdapter/RedisSocialSignupTokenStore 구현
- [x] 이메일/SMS 본문 템플릿 작성
- [x] 외부 API/Secret은 환경변수 기반으로만 주입
- [x] 인증번호 발송/확인 service 구현
- [x] verificationToken 발급 구현
- [x] 6자리 랜덤 인증번호 생성기 + SHA-256 codeHash 구현
- [x] member_verifications row 생성, expires_at 5분, resend_available_at 60초 저장
- [x] 인증 성공 시 VERIFIED/verified_at 저장, 실패 시 remaining_attempts 차감
- [x] verificationToken purpose/target/channel/expiry/status 검증 구현
- [x] 인증번호 발송 rate limit: target+purpose 기준 60초 재발송 제한
- [x] 인증번호 확인 rate limit: verificationId 기준 최대 5회 실패 허용
- [x] UserRecoveryService 인터페이스 작성
- [x] 개인회원/기업회원 아이디 찾기 구현
- [x] loginId masking 구현 — 앞 3자 + * 마스킹
- [x] 비밀번호 resetToken 발급 구현, SHA-256 hash 저장, 1회 사용 처리
- [x] 비밀번호 재설정 구현 + 해당 member 모든 refresh token 폐기
- [x] 모든 예상 가능한 예외를 CustomException + UserAuthErrorCode로 처리
- [x] 로그인/찾기/재설정 실패 메시지가 계정 존재 여부를 노출하지 않는지 확인

## Phase 5 - Controller / API 구현

- [x] `UserAuthController` 기존 login/refresh/logout/me/status 계약 재확인
- [x] `POST /api/v1/user/members/login` response가 프론트 `LoginResponse`와 일치하는지 확인
- [x] `POST /api/v1/user/members/token/refresh`가 body 없이 cookie만 사용하는지 확인
- [x] `POST /api/v1/user/members/token/refresh` response body에 refresh token이 없는지 확인
- [x] `UserRegisterController` 작성
- [x] `GET /api/v1/user/members/login-id/check` 구현
- [x] `POST /api/v1/user/members/register/user` 구현
- [x] `POST /api/v1/user/members/register/company` 구현
- [x] `POST /api/v1/user/members/company/employment-certificate` 구현
- [x] 재직증명서 Multipart 업로드 Service 구현 — PDF 확장자·Tika MIME type·5MB 이하 검증 후 S3 업로드 및 fileId 발급
- [x] S3 기반 `EmploymentCertificateFilePort` 실제 구현 — S3 객체 존재 여부·MIME type·크기·key prefix 검증, SdkException catch
- [x] `S3EmploymentCertificateFileAdapter` 구현 및 `StubEmploymentCertificateFileAdapter` `@Profile(local,test)` 유지
- [x] `GET /api/v1/user/members/oauth/{provider}/authorize` 구현
- [x] `GET /api/v1/user/members/oauth/{provider}/callback` 구현
- [x] `POST /api/v1/user/members/register/social/complete` 구현
- [x] OAuth callback 성공 시 JSON으로 응답 (SPA 프론트 제어 방식 확정)
- [x] `UserVerificationController` 작성
- [x] `POST /api/v1/user/members/verifications/send` 구현
- [x] `POST /api/v1/user/members/verifications/confirm` 구현
- [x] `UserRecoveryController` 작성
- [x] `POST /api/v1/user/members/recovery/find-id` 구현
- [x] `POST /api/v1/user/members/recovery/password-token` 구현
- [x] `POST /api/v1/user/members/recovery/reset-password` 구현
- [x] 모든 controller response가 `ApiResponse<T>`인지 확인
- [x] Controller에서 직접 `Map` 반환이 없는지 확인
- [x] Controller에서 반복 try-catch가 없는지 확인
- [x] SecurityConfig permitAll 목록에 public API가 반영되었는지 확인
- [x] OAuth authorize/callback/register social complete API가 permitAll인지 확인

---

## Phase 6 - Swagger 문서화

- [x] `UserAuthControllerDocs` 기존 문서와 실제 response 불일치 점검
- [x] `UserRegisterControllerDocs` 작성
- [x] `UserVerificationControllerDocs` 작성
- [x] `UserRecoveryControllerDocs` 작성
- [x] `UserSocialAuthControllerDocs` 작성
- [x] 회원가입 request/response 예시 작성
- [x] 인증번호 발송/확인 request/response 예시 작성
- [x] AWS SES / SOLAPI 실제 provider 사용 조건 및 sandbox 제약 설명 작성
- [x] OAuth provider별 authorize/callback 예시 작성
- [x] 아이디 찾기 request/response 예시 작성
- [x] 비밀번호 재설정 request/response 예시 작성
- [x] token refresh cookie-only 설명 작성
- [x] Error response 예시 작성
- [x] Swagger enum allowable values 작성 — DTO @Schema(allowableValues) 반영
- [x] Controller에 Swagger annotation이 직접 과도하게 작성되지 않았는지 확인 (docs/ 분리 패턴 준수)
- [x] Controller에 @Tag 직접 선언 추가 (SpringDoc 렌더링 안정화)
- [x] `api-schema.md`와 Swagger 예시가 일치하는지 확인
- [x] DTO 필드에 Swagger `@Schema` 설명 추가 — UserRegisterDto/UserVerificationDto/UserRecoveryDto/UserSocialAuthDto
- [x] Enum field의 Swagger allowable values 정리
- [x] ApiResponse.ok() statusCode=200, created() statusCode=201 수정 — API schema 계약 일치
- [x] 24시간 orphan file 설명 — "별도 배치 작업 예정"으로 수정 (미구현 기능 오해 제거)

---

## Phase 7 - Test / 예외 케이스 검증
> Phase 4에서 Service 단위 테스트 완료 항목은 [x] 표시. Phase 7은 Controller·통합·E2E 테스트 전담.

- [x] login 성공 테스트 — `UserLoginServiceImplTest.정상_로그인_USER_accessToken_반환`
- [x] login roleType 불일치 테스트 — `UserLoginServiceImplTest.roleType_불일치_AUTH_INVALID_CREDENTIALS`
- [x] login 비밀번호 불일치 테스트 — `UserLoginServiceImplTest.비밀번호_불일치_AUTH_INVALID_CREDENTIALS`
- [x] login 잠금/정지/탈퇴 계정 테스트 — `UserLoginServiceImplTest.SUSPENDED_/BANNED_/WITHDRAWN_계정_*`
- [x] refresh cookie 없음 테스트 — `UserAuthControllerTest.refreshToken_cookie_없음_401`
- [x] refresh response에 refreshToken이 없는지 테스트 — `UserAuthControllerTest.refreshToken_response_body에_refreshToken_없음`
- [x] logout Service 테스트 — Redis key 삭제, access blacklist 등록 — `UserRefreshLogoutServiceImplTest.logout_refresh_Redis_key_삭제_및_access_blacklist_등록`
- [x] logout Controller 테스트 — response에 refresh cookie 삭제 — `UserAuthControllerTest.logout_Set_Cookie_Max_Age_0`
- [x] loginId 중복 확인 성공/실패 테스트 — `UserRegisterServiceImplTest.checkLoginId_*` / `UserRegisterControllerTest.checkLoginId_*`
- [x] loginId 형식 오류 테스트 — `UserRegisterServiceImplTest.checkLoginId_형식_오류_5자_LOGIN_ID_INVALID` / `checkLoginId_특수문자_포함_LOGIN_ID_INVALID`
- [x] 개인회원 가입 성공 테스트 — `UserRegisterServiceImplTest.registerUser_성공_시_personalProfile_저장` / `UserRegisterControllerTest.registerUser_성공_201`
- [x] 개인회원 가입 성공 시 `personal_profiles` 빈 row 생성 테스트 — 동일 테스트
- [x] 개인회원 가입 시 `company_verification_agreed`, `sms_agreed`가 `null`로 저장되는지 테스트 — `UserRegisterServiceImplTest.registerUser_companyVerification_sms_null_저장`
- [x] 개인회원 login/me/status 응답에서 `companyApprovalStatus=NONE`이 반환되고 DB에 저장되지 않는지 테스트 — `UserLoginServiceImplTest.개인회원_로그인_companyApprovalStatus_NONE_반환_및_DB_미조회`
- [x] 기업회원 가입 성공 테스트 — `UserRegisterServiceImplTest.registerCompany_성공_token_미발급` / `UserRegisterControllerTest.registerCompany_성공_201`
- [x] 기업회원 가입 성공 후 token이 발급되지 않는지 테스트 — 동일 테스트 (응답 roleType=COMPANY, companyApprovalStatus=PENDING_REVIEW만 반환)
- [x] 기업회원 사업자등록정보 외부 검증 성공/실패 테스트 — `UserRegisterServiceImplTest.registerCompany_사업자등록_검증_실패_COMPANY_BUSINESS_VERIFICATION_FAILED`
- [x] 기업회원 외부 검증 API 장애 테스트 — `UserRegisterServiceImplTest.registerCompany_사업자등록_API_장애_COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE`
- [x] 기업회원 약관 동의 저장 테스트 — `UserRegisterServiceImplTest.registerCompany_약관_저장_검증`
- [x] 승인 대기 기업회원 로그인 403 및 token 미발급 테스트 — `UserLoginServiceImplTest.PENDING_REVIEW_기업회원_AUTH_COMPANY_PENDING_REVIEW`
- [x] 승인 완료 기업회원 로그인 성공 테스트 — `UserLoginServiceImplTest.APPROVED_기업회원_로그인_성공`
- [x] loginId/email/phone/businessNumber 중복 테스트 — `UserRegisterServiceImplTest.registerUser_loginId/email/phone_중복_*` / `registerCompany_businessNumber_중복_*`
- [x] 필수 약관 미동의 테스트 — `UserRegisterServiceImplTest.registerUser_service_약관_미동의_*` / `registerUser_privacy_약관_미동의_*` / `registerCompany_companyVerification_미동의_*` / `registerCompany_sms_미동의_*`
- [x] 비밀번호 정책 위반 테스트 — `UserRegisterServiceImplTest.registerUser_loginId_포함_비밀번호_정책위반`
- [x] 인증번호 발송 성공 테스트 — `UserVerificationServiceImplTest.send_EMAIL_성공_emailSenderPort_호출` / `send_PHONE_성공_smsSenderPort_호출` / `UserVerificationControllerTest.send_성공_200`
- [x] 인증번호 확인 성공 테스트 — `UserVerificationServiceImplTest.confirm_성공_verificationToken_반환` / `UserVerificationControllerTest.confirm_성공_200`
- [x] 인증번호 오입력/만료/시도 횟수 초과 테스트 — `UserVerificationServiceImplTest.confirm_코드불일치_*` / `confirm_만료된_인증번호_*` / `confirm_마지막_실패_remainingAttempts_0_VERIFICATION_RATE_LIMITED`
- [x] verificationToken status 미인증/만료/purpose 불일치 테스트 — `UserVerificationServiceImplTest.validateVerificationToken_status_SENT_*` / `validateVerificationToken_만료_*` / `validateVerificationToken_purpose_불일치_*`
- [x] 인증번호 재전송 60초 제한 테스트 — `UserVerificationServiceImplTest.send_재발송_60초_제한_VERIFICATION_RATE_LIMITED`
- [x] `member_verifications.expires_at` 5분 만료 테스트 — `UserVerificationServiceImplTest.send_EMAIL_expiresAt_5분_후_resendAvailableAt_60초_후` (expiresAt≈now+300s, resendAvailableAt≈now+60s 경계 검증)
- [x] AWS SES mock 기반 이메일 발송 테스트 — `AwsSesEmailSenderAdapterTest` (sendEmail 호출, 발신자/수신자/코드 포함, SdkException→VERIFICATION_EMAIL_UNAVAILABLE)
- [x] SOLAPI mock 기반 SMS 발송 테스트 — `SolapiSmsSenderAdapterTest` (endpoint, Authorization 헤더, HTTP오류/연결장애→VERIFICATION_SMS_UNAVAILABLE)
- [x] 개인회원 아이디 찾기 성공 테스트 — `UserRecoveryServiceImplTest.findId_개인회원_EMAIL_성공_maskedLoginId` / `UserRecoveryControllerTest.findId_성공_200`
- [x] 기업회원 아이디 찾기 성공 테스트 — `UserRecoveryServiceImplTest.findId_기업회원_성공_maskedLoginId`
- [x] 아이디 찾기 결과 없음 `found=false` 테스트 — `UserRecoveryServiceImplTest.findId_결과_없음_found_false` / `UserRecoveryControllerTest.findId_결과없음_200`
- [x] loginId masking 테스트 (앞 3자+***+뒤 2자 고정 포맷) — `UserRecoveryServiceImplTest.findId_loginId_마스킹_앞3자_별표_뒤2자`
- [x] password resetToken 발급 테스트 — `UserRecoveryServiceImplTest.issuePasswordToken_개인회원_성공` / `UserRecoveryControllerTest.issuePasswordToken_성공_200`
- [x] resetToken 실패 5회 차단 테스트 — `UserRecoveryServiceImplTest.resetPassword_실패_5회_초과_차단`
- [x] resetToken 만료·이미 사용된 token 차단 테스트 — `UserRecoveryServiceImplTest.resetPassword_토큰_만료_*` / `resetPassword_토큰_이미_사용됨_*`
- [x] 비밀번호 재설정 성공 테스트 — `UserRecoveryServiceImplTest.resetPassword_성공_refreshTokenStore_deleteAll_호출` / `UserRecoveryControllerTest.resetPassword_성공_200`
- [x] 비밀번호 재설정 후 refresh token 전체 폐기 테스트 — 동일 테스트
- [x] OAuth state 불일치 실패 테스트 — `UserSocialAuthServiceImplTest.callback_state_불일치_OAUTH_STATE_INVALID`
- [x] 기존 소셜 계정 로그인 성공 테스트 — `UserSocialAuthServiceImplTest.callback_세션퇴출_기존_accessToken_blacklist_등록` / `UserSocialAuthControllerTest.callback_기존계정_로그인_200`
- [x] 최초 소셜 계정 callback 시 `socialSignupToken` 발급 테스트 — `UserSocialAuthControllerTest.callback_최초가입_200`
- [x] `socialSignupToken` 중복 소비 차단 테스트 — `RedisSocialSignupTokenStoreTest.consume_중복_소비_두_번째_호출_empty`
- [x] `socialSignupToken` TTL 10분 + raw token 저장값 미포함 테스트 — `RedisSocialSignupTokenStoreTest.issue_TTL_10분_설정` / `issue_rawToken_저장값에_미포함`
- [x] Kakao/Naver/Google email nullable(빈 문자열) 처리 테스트 — `RedisSocialSignupTokenStoreTest.consume_providerEmail_없음_null_반환`
- [x] `socialSignupToken` provider 불일치 시 `SOCIAL_SIGNUP_TOKEN_INVALID` 테스트 — `UserSocialAuthServiceImplTest.complete_provider_불일치_SOCIAL_SIGNUP_TOKEN_INVALID`
- [x] 소셜 회원가입 추가정보 완료 성공 테스트 — `UserSocialAuthControllerTest.complete_성공_200`
- [x] 재직증명서 PDF 업로드 성공 테스트 — `S3EmploymentCertificateFileAdapterTest.upload_성공_fileId_반환` / `UserRegisterControllerTest.uploadCertificate_성공_200`
- [x] PDF 아님/MIME 불일치/5MB 초과 테스트 — `S3EmploymentCertificateFileAdapterTest.upload_비PDF_확장자_*` / `upload_비PDF_내용_*` / `upload_5MB초과_*` / `validate_*`
- [x] 프론트 `types/user/member.ts`와 response field 대조 완료 — addressDetail 선택 수정, OAuthAuthorizeResponse/OAuthCallbackLoginResponse/OAuthCallbackSignupRequiredResponse 타입 추가, isOAuthCallbackLoginResponse 타입가드 추가
- [x] MSW mock 갱신 완료 — memberHandlers에 신규 API 핸들러 12개 추가, token refresh body에서 refreshToken 제거, socialRegisterApi mock 플래그 제거 및 실제 endpoint 전환, socialAuthApi 신규 추가
