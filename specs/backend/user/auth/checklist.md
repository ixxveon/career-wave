# Checklist: 사용자 인증 기능 (Backend)

> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.
> 기준: `docs/CONVENTION.md`, `specs/backend/auth/*`, `specs/frontend/user/member/*`, `api-schema.md`

---

## 1. Spec / Convention 일치

- [ ] `spec.md`, `plan.md`, `tasks.md`, `api-schema.md`, `checklist.md`가 서로 충돌하지 않는다.
- [ ] `docs/CONVENTION.md`의 패키지, DTO, Exception, Swagger, ApiResponse 규칙을 반영했다.
- [ ] 기존 `specs/backend/auth/constitution.md`의 JWT 보안 원칙과 충돌하지 않는다.
- [ ] `specs/frontend/user/member/api-schema.md` 및 `frontend/src/types/user/member.ts`와 필드명이 일치한다.
- [ ] MSW mock을 최종 계약 원본으로 사용하지 않았다.
- [x] `members.role_type`은 `USER`, `COMPANY`로 통일하고 `ROLE_` prefix는 security authority에서만 사용한다.
- [x] `members.member_status`는 `BLACKLISTED`까지 포함한다.
- [x] `hr_managers.hr_status`는 `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION`, `REMOVED`로 통일한다. — user `HrStatus` enum 신규 정의, admin `HrStatus` enum도 ERD 기준으로 수정
- [x] 기존 Java enum과 QueryRepository mapping이 ERD enum 값과 일치한다. — admin `HrStatus` · admin `AdminMemberServiceImpl` · 테스트 동기화 완료

---

## 2. Package / Architecture

- [ ] 구현 패키지 위치를 `user/member`로 유지할지, `user/auth`로 분리할지 문서에 명확히 적었다.
- [ ] `global`이 `user` 도메인 코드를 직접 참조하지 않는다.
- [ ] `user`와 `admin` 패키지가 서로 직접 참조하지 않는다.
- [ ] Service interface와 `service/impl` 구현체를 분리했다.
- [ ] Controller는 Service interface 타입으로 의존성을 주입한다.
- [ ] Controller에 비즈니스 로직이 없다.
- [ ] Entity를 API 응답으로 직접 반환하지 않는다.

---

## 3. JWT / Token

- [ ] 로그인 성공 시 access token은 response body의 `data.accessToken`에만 담는다.
- [ ] refresh token은 HttpOnly Cookie로만 전달한다.
- [ ] refresh token을 request body로 받지 않는다.
- [ ] refresh token을 response body로 반환하지 않는다.
- [ ] token refresh response는 `accessToken`만 반환한다.
- [ ] access token을 `localStorage`에 저장하는 흐름이 없다.
- [ ] refresh token은 Redis에 원문 저장하지 않고 hash 저장한다.
- [ ] 최초 소셜 가입용 `socialSignupToken`은 Redis `user-auth:social-signup:{tokenHash}`에 저장하고 TTL 10분을 적용한다.
- [ ] `socialSignupToken` raw token은 저장하지 않고, 추가정보 완료 후 key를 삭제해 1회 사용을 보장한다.
- [ ] refresh token rotation 시 기존 token을 무효화한다.
- [ ] logout 시 refresh key 삭제, access token jti blacklist, cookie 만료를 처리한다.
- [ ] Controller에서 token을 직접 파싱하지 않고 SecurityContext 또는 `@AuthenticationPrincipal`을 사용한다.
- [ ] 이메일 인증 provider는 `AWS SES`, SMS 인증 provider는 `SOLAPI / CoolSMS`로 명시되어 있다.
- [ ] 외부 API Key/Secret은 환경변수로만 주입하고 코드 하드코딩이 없다.

---

## 4. API Contract

- [ ] `POST /api/v1/user/members/login` request가 `LoginRequest`와 일치한다.
- [ ] `POST /api/v1/user/members/login` response가 `LoginResponse`와 일치한다.
- [ ] `POST /api/v1/user/members/token/refresh` response가 `TokenRefreshResponse`와 일치한다.
- [ ] 승인 대기/반려/보완 요청 기업회원 로그인은 access token/refresh token을 발급하지 않는다.
- [ ] `GET /api/v1/user/members/login-id/check` response가 `CheckLoginIdResponse`와 일치한다.
- [ ] 개인회원 가입 request/response가 `UserRegisterRequest`, `UserRegisterResponse`와 일치한다.
- [ ] 기업회원 가입 request/response가 `CompanyRegisterRequest`, `CompanyRegisterResponse`와 일치한다.
- [ ] 인증번호 발송/확인 request/response가 프론트 타입과 일치한다.
- [ ] 아이디 찾기 request/response가 `FindIdRequest`, `FindIdResponse`와 일치한다.
- [ ] 비밀번호 resetToken 발급 request/response가 프론트 타입과 일치한다.
- [ ] 비밀번호 재설정 request/response가 프론트 타입과 일치한다.
- [ ] 소셜 OAuth authorize/callback/register complete API 계약이 명확하다.
- [ ] `socialSignupToken`이 최초 소셜 가입 추가정보 완료에 포함되어 있다.
- [ ] 모든 API 응답이 `ApiResponse<T>` wrapper를 사용한다.

---

## 5. Validation

- [ ] loginId는 영문/숫자 6~20자만 허용한다.
- [ ] 비밀번호는 8~64자, 영문/숫자/특수문자 포함, loginId 포함 금지를 검증한다.
- [ ] email 형식을 서버에서 검증한다.
- [ ] phone은 숫자만 정규화 후 `010` 시작 11자리인지 검증한다.
- [ ] businessNumber는 숫자 10자리인지 검증한다.
- [ ] companyName, ceoName, certificateNumber를 필수로 검증한다.
- [ ] address/postalCode/roadAddress는 필수, addressDetail/jibunAddress는 선택 입력으로 검증한다.
- [ ] verification code는 6자리 숫자인지 검증한다.
- [ ] `VerificationPurpose`는 `REGISTER`, `FIND_ID`, `RESET_PASSWORD`를 사용한다.
- [ ] `companyType`은 허용 enum 값만 받는다.
- [ ] 재직증명서는 PDF, MIME type, 5MB 이하를 서버에서 검증한다.
- [ ] 프론트 validation만 믿지 않고 서버에서 동일 검증을 수행한다.

---

## 6. Register

- [ ] 개인회원 가입 시 loginId/email/phone 중복을 최종 저장 직전에 다시 확인한다.
- [ ] `members.phone` unique 제약과 service 중복 검사가 함께 적용되어 있다.
- [ ] 기업회원 가입 시 loginId/managerEmail/managerPhone/businessNumber 중복을 최종 저장 직전에 다시 확인한다.
- [ ] 개인회원 가입 시 `emailVerificationToken`, `phoneVerificationToken`을 검증한다.
- [ ] 기업회원 가입 시 `managerPhoneVerificationToken`, `managerEmailVerificationToken`을 검증한다.
- [ ] 필수 약관 동의를 서버에서 검증한다.
- [ ] 선택 약관은 미전달 시 `false`로 저장한다.
- [ ] 약관 동의값은 `member_terms_agreements`에 저장한다.
- [ ] 개인회원 가입 시 `company_verification_agreed`, `sms_agreed`는 `null`로 저장한다.
- [ ] 기업회원 가입 시 `company_verification_agreed=true`, `sms_agreed=true`를 필수 검증한다.
- [ ] 개인회원의 `age` 동의는 백엔드 request에 포함하지 않고 프론트 UX validation으로만 처리한다.
- [ ] 비밀번호는 BCrypt hash로 저장한다.
- [ ] 개인회원은 `roleType=USER`, `memberStatus=ACTIVE`로 생성한다.
- [ ] 개인회원 가입 성공 시 빈 `personal_profiles` row를 생성한다.
- [ ] 기업회원은 `roleType=COMPANY`, `companyApprovalStatus=PENDING_REVIEW`, `hr_managers.hr_status=PENDING_REVIEW` 신청 상태로 생성한다.
- [ ] 개인회원 응답의 `companyApprovalStatus=NONE`은 DB 저장값이 아닌 응답 전용 가상값으로 처리한다.
- [ ] 기업회원 가입 성공 응답은 가입 완료가 아니라 신청 접수 메시지다.
- [ ] 기업회원 가입 성공 시 access token/refresh token을 발급하지 않는다.
- [ ] 기업회원 승인/반려 결과 이메일 발송 책임이 admin 승인/반려 service에 있음을 문서화했다.
- [ ] 재직증명서 `employmentCertificateFileId`가 실제 업로드된 파일인지 검증한다.
- [ ] 파일 업로드 성공 후 가입 실패 시 orphan file 처리 정책이 있다.
- [ ] 국세청 사업자등록정보 `status` API를 `businessNumber`만으로 호출한다.
- [ ] `start_dt`, `p_nm` 기반 validate는 이번 범위에서 사용하지 않는다.
- [ ] 외부 사업자 검증 실패/장애 ErrorCode가 정의되어 있다.
- [ ] 주소 검색은 이번 범위에서 프론트 버튼 활성화와 한국 도로명주소 API 연동까지 포함한다.
- [ ] 기업회원 가입 payload에 `certificateNumber`, `postalCode`, `roadAddress`, `jibunAddress`가 포함되어야 함을 문서화했다.

---

## 7. Social OAuth

- [ ] Kakao/Naver/Google OAuth provider 범위가 명확하다.
- [ ] Apple 로그인이 범위 제외로 명시되어 있다.
- [ ] OAuth authorize API가 state를 생성/저장한다.
- [ ] OAuth callback API가 state, provider token, provider userinfo를 검증한다.
- [ ] 기존 소셜 계정이면 일반 로그인과 동일하게 access token + refresh cookie를 발급한다.
- [ ] 최초 소셜 사용자에게는 일반 token이 아니라 `socialSignupToken`만 발급한다.
- [ ] `socialSignupToken`은 Redis에 hash key로 저장하고 TTL 10분, 1회 사용 정책을 적용한다.
- [ ] 소셜 추가정보 완료 API가 `socialSignupToken`, 휴대폰 인증 token, 필수 약관을 검증한다.
- [ ] `social_accounts` ERD 기준으로 OAuth 계정 연결을 처리한다.

---

## 8. Verification / Recovery

- [ ] 인증 완료 여부는 서버 발급 `verificationToken`으로만 판단한다.
- [ ] `verificationToken`은 purpose, target, channel, expiresAt, verificationStatus를 검증한다.
- [ ] 인증번호/verificationToken은 `member_verifications` 테이블을 사용한다.
- [ ] 인증번호는 `expires_at` 5분, 재전송 제한은 60초, 실패 제한은 5회로 명시되어 있다.
- [ ] 인증번호 발송/확인에 rate limit 또는 후속 작업 명시가 있다.
- [ ] 아이디 찾기 결과는 마스킹된 loginId만 반환한다.
- [ ] 아이디 찾기 실패 시 계정 존재 여부를 직접 노출하지 않는다.
- [ ] 비밀번호 resetToken은 짧은 TTL을 가진다.
- [ ] resetToken은 원문 저장하지 않고 hash 저장한다.
- [ ] resetToken은 1회 사용 후 재사용할 수 없다.
- [ ] 비밀번호 재설정 후 기존 refresh token 전체 폐기 정책이 반영되어 있다.

---

## 9. Error Handling

- [ ] 예상 가능한 예외는 `CustomException + UserAuthErrorCode`로 처리한다.
- [ ] `new RuntimeException(...)` 직접 생성이 없다.
- [ ] Controller 내부 반복 try-catch가 없다.
- [ ] Controller가 직접 `Map`을 반환하지 않는다.
- [ ] 로그인 실패 메시지는 공통 메시지다.
- [ ] 찾기/재설정 실패 메시지는 계정 존재 여부를 노출하지 않는다.
- [ ] ErrorCode와 HTTP status mapping이 `api-schema.md`에 정리되어 있다.

---

## 10. Swagger

- [ ] Swagger annotation은 가능한 `docs` 인터페이스에 작성했다.
- [ ] Controller에 Swagger annotation이 과도하게 직접 작성되지 않았다.
- [ ] Swagger request 예시가 `api-schema.md`와 일치한다.
- [ ] Swagger response 예시가 `api-schema.md`와 일치한다.
- [ ] Swagger error response 예시가 있다.
- [ ] Enum allowable values가 Swagger에 표시된다.

---

## 11. Test

- [ ] 로그인 성공/실패 테스트 작성
- [ ] roleType 불일치 테스트 작성
- [ ] 잠금/정지/탈퇴 계정 로그인 테스트 작성
- [ ] refresh cookie 없음/만료 테스트 작성
- [ ] refresh response에 refresh token이 없는지 테스트 작성
- [ ] logout 테스트 작성
- [ ] loginId 중복 확인 테스트 작성
- [ ] 개인회원 가입 성공/실패 테스트 작성
- [ ] 개인회원 가입 시 빈 `personal_profiles` row 생성 테스트 작성
- [ ] 기업회원 가입 성공/실패 테스트 작성
- [ ] 기업회원 가입 후 token 미발급 테스트 작성
- [ ] 승인 대기 기업회원 로그인 403 테스트 작성
- [ ] 승인 완료 기업회원 로그인 성공 테스트 작성
- [ ] OAuth state 불일치 테스트 작성
- [ ] 기존 소셜 계정 로그인 성공 테스트 작성
- [ ] 최초 소셜 계정 callback의 `socialSignupToken` 발급 테스트 작성
- [ ] 소셜 회원가입 추가정보 완료 성공/실패 테스트 작성
- [ ] 인증번호 발송/확인 테스트 작성
- [ ] verificationToken 만료/purpose 불일치 테스트 작성
- [ ] 아이디 찾기 성공/결과 없음 테스트 작성
- [ ] loginId masking 테스트 작성
- [ ] 비밀번호 resetToken 발급/만료/재사용 테스트 작성
- [ ] 비밀번호 재설정 성공/정책 위반 테스트 작성
- [ ] 재직증명서 업로드 성공/실패 테스트 작성
- [ ] 프론트 타입과 response field 수동 대조 완료

---

## 12. Merge 전 최종 확인

- [ ] `tasks.md` 모든 항목 완료 여부를 확인했다.
- [ ] `api-schema.md`와 실제 Controller response가 일치한다.
- [ ] Swagger와 `api-schema.md`가 일치한다.
- [ ] SecurityConfig permitAll 목록과 public API 목록이 일치한다.
- [ ] `.env` 또는 secret 값이 커밋되지 않았다.
- [ ] MSW mock 갱신 필요 여부를 PR 본문에 적었다.
