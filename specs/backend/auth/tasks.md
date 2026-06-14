# Auth 작업 목록 (Tasks)

> 원칙: 세로 슬라이스(한 주체 end-to-end 먼저 관통 후 확장). 각 Phase는 자체 테스트 포함.

## Phase 1: JWT 설정 / 유틸 ✅ PR #323 + PR #351
- [x] global/auth 패키지 구조 생성
- [x] JwtProperties (user/admin secret·issuer·aud·access/refresh 만료 분리)
- [x] JwtTokenProvider 생성 (accountType별 키 선택, leeway 적용)
- [x] Access/Refresh 생성·검증 로직 + 단위 테스트(서명/만료/위조)
- [x] PasswordEncoder(BCrypt) Bean
- [x] AuthErrorCode enum
- [x] 공통 ErrorResponse DTO + @RestControllerAdvice
- [x] AuthenticationEntryPoint(401) / AccessDeniedHandler(403)

## Phase 2: User login + token 발급 ✅ PR #323 (AccountStatusFilter 제외)
- [x] AuthPrincipal 정의 (adminRole 필드 포함, 사용자는 null)
- [x] JwtAuthenticationFilter (Bearer 추출 → 검증 → SecurityContext 저장, 상태 검증은 AccountStatus 단계로 분리)
- [x] userSecurityFilterChain 골격 (CSRF off, STATELESS, CORS, addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class))
- [x] @EnableMethodSecurity 활성화 (이후 @PreAuthorize 대비)
- [x] AccountStatusAuthorizationFilter/Guard 골격 (일반 authenticated API는 ACTIVE만 허용, 예외 경로 분리) ← Phase 4에서 구현 완료
- [x] UserLoginService (조회·hash 비교·상태 검증, `roleType` 필수 검증)
- [x] POST /api/v1/user/members/login
- [x] LoginResponse DTO (member 포함, camelCase)
- [x] FE LoginRequest / `useLogin.ts` / MSW `memberHandlers.ts`의 `roleType` 전송 계약 확인 ← PR #345
- [x] 통합 테스트: 토큰 없음→401, 유효 토큰→200, 로그인 성공→accessToken 발급, `roleType` 누락/오류 검증

## Phase 3: Refresh token 저장 / 재발급 + Logout + Blacklist ✅ PR #361

### PR #323 이월 항목 (선처리)
- [x] `Admin.java` — `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 추가
- [x] `UserLoginServiceImpl` — LOCKED 자동 복구 시 `member.recoverFromLock()` → DB 저장(dirty checking)
- [x] `UserLoginServiceImpl` — `resolveCompanyApprovalStatus()` 중복 호출 제거

### 인프라
- [x] `build.gradle` — `spring-boot-starter-data-redis` 의존성 추가
- [x] `application.yml` / `application-local.yml` — Redis 설정 추가
- [x] `auth/store/` 패키지 생성

### JwtTokenProvider 개선 (스펙 누락 + 버그 수정)
- [x] **[Issue #339] roleType claim 형식 통일** — `USER`/`COMPANY`/`ADMIN` (ROLE_ prefix 없이 저장, AuthPrincipal에서만 부여)
- [x] refresh token에 `sessionId` claim 추가 (UUID, key 조합용)
- [x] access/refresh token에 `aud` claim 추가 — "user" / "admin" (교차 사용 차단)
- [x] `parse()` 시 `aud` claim 검증 적용
- [x] clock skew leeway 적용 (60초)
- [x] `AuthErrorCode` — `AUTH_REFRESH_REUSE_DETECTED` (401) 추가

### RefreshTokenStore + Logout
- [x] `RefreshTokenStore` (Redis, key `refresh:{accountType}:{subjectId}:{sessionId}`, SHA-256 hash 저장 + TTL)
- [x] `TokenBlacklistStore` (Redis, key `blacklist:{jti}`, TTL = access token 잔여 수명 + leeway)
- [x] User 로그인 시 RefreshTokenStore에 저장 (sessionId 포함) + access jti 저장 (5세션 퇴출 시 blacklist 등록용)
- [x] Admin 로그인 시 RefreshTokenStore에 저장 (단일 세션 — 신규 로그인 시 기존 세션 전부 삭제 + access jti blacklist)
- [x] `POST /api/v1/user/members/token/refresh` 개선 (Redis rotation + 재사용 탐지 + 비ACTIVE 차단)
- [x] `POST /api/v1/admin/auth/refresh` 개선 (Redis rotation + admins.status ACTIVE 검증 + adminRole DB 최신값 조회)
- [x] rotation 적용 (같은 sessionId key를 새 hash로 교체, TTL 갱신)
- [x] 재사용 탐지 (key 없음/hash 불일치) → 해당 subject 전체 세션 폐기 + 401 REUSE_DETECTED
- [x] USER 5세션 상한 처리 (초과 시 가장 오래된 세션 key 삭제 + 해당 access jti blacklist 등록)
- [x] refreshToken Set-Cookie Path — user `/api/v1/user/members`, admin `/api/v1/admin/auth`
- [x] `POST /api/v1/user/members/logout` (refresh Redis key 삭제 + access jti blacklist + cookie Max-Age=0, 비ACTIVE 허용)
- [x] `POST /api/v1/admin/auth/logout` (동일 처리)
- [x] `JwtAuthenticationFilter` — blacklist jti 조회 추가 + jti null fail-closed

### 테스트
- [x] 재발급 성공 (rotation 확인)
- [x] body refreshToken 거부 (cookie only) — endpoint에 body 파라미터 없으므로 구조적으로 충족
- [x] 만료·폐기 refresh → 401
- [x] 비ACTIVE 재발급 차단 → 401
- [x] 재사용 탐지 → 전체 세션 폐기 + 401
- [x] USER 5세션 상한 → 오래된 세션 삭제 ← Phase 5 테스트 작성
- [x] ADMIN 단일 세션 → 신규 로그인 시 기존 세션 폐기 ← Phase 5 테스트 작성
- [x] logout 후 access token(blacklist) 재사용 → 401
- [x] logout 후 refresh token 재사용 → 401 (재사용 탐지로 간접 커버)
- [x] admin logout 후 access token(blacklist) 재사용 → 401 ← Phase 5 테스트 작성

## Phase 4: Security filter + 권한 처리 ✅ PR #406
> `TokenBlacklistStore` / logout endpoint는 Phase 3에서 구현 완료. Phase 4는 계정 상태 필터·권한 제어·me/status에 집중.
- [x] LoginAttemptStore (Redis 실패 카운트) + locked_until DB 저장 (5회→LOCKED+locked_until 15분)
- [x] 잠금 자동 복구 (locked_until 경과 시 ACTIVE 복구 + 카운트 초기화)
- [x] 계정 상태 검증 통합 — AccountStatusAuthorizationFilter (ACTIVE만 허용, SUSPENDED/BANNED/WITHDRAWN→403, LOCKED→423)
- [x] JwtAuthenticationFilter ↔ TokenBlacklistStore 연동 확인 (Phase 3에서 구현, 이번 PR에서 동작 검증)
- [x] ROLE_USER / ROLE_COMPANY 전용 API 접근 제어 (requestMatchers().hasAnyRole())
- [x] GET /api/v1/user/members/me/status (suspend_histories 최근 이력 조인, AccountStatus 예외로 정지 회원도 접근 가능)
- [x] 테스트: 실패 카운트 증가 / 5회 LOCKED / 자동복구 / 잠금 중 차단 (LoginAttemptServiceImplTest)
- [x] logout cookie Max-Age=0 클리어 (spec 누락 수정)
- [x] api-schema.md roleType claim 형식 수정 (spec 오류 수정)

## Phase 5: Admin auth 연결 + Swagger / Test / 문서 검증 ✅ 이번 브랜치 (feature/auth-phase5-admin-swagger)
> `POST /api/v1/admin/auth/logout`은 Phase 3에서 구현 완료. Phase 5는 adminRole 권한·실패 잠금·Swagger·문서 검증 포함.

### Admin auth 연결
- [x] adminSecurityFilterChain (@Order(1)) 분리 ← Phase 5 구현 완료 (securityMatcher("/api/v1/admin/**"))
- [ ] `Admin.lastLoginIp` 갱신 ← Admin entity에 last_login_ip 컬럼 없음; ERD 확인 후 결정
- [x] POST /api/v1/admin/auth/login (adminRole claim 포함) ← PR #361
- [x] POST /api/v1/admin/auth/refresh (단일 세션 rotation, admins.status 검증) ← PR #361
- [x] refreshToken Set-Cookie Path `/api/v1/admin/auth` + 삭제 동일 Path ← PR #361 + PR #406
- [x] AuthPrincipal에 ROLE_MASTER/CS/BACKEND authority 추가
- [x] adminRole(MASTER/CS/BACKEND) @PreAuthorize 적용 — 현재 존재하는 컨트롤러에 적용 완료
  - MASTER+CS: `AdminMemberController`, `AdminReportController`, `AdminCsController`, `AdminFaqController`, `AdminNoticeController`, `AdminInquiryController`
  - MASTER+BACKEND: `AdminAiController`
  - [ ] 미구현 컨트롤러 생성 시 동일 패턴 적용 필요: `admins`(MASTER), `payments`(MASTER), `stats`(MASTER), `scraping`(MASTER+BACKEND), `log`(MASTER+BACKEND), `companies`(MASTER), `settlements`(MASTER)
- [x] 관리자 로그인 실패 잠금 5회 — LoginAttemptStore ADMIN 연동

### 테스트
- [x] admin 로그인 실패 5회 → LOCKED, 성공 시 카운터 초기화
- [x] ADMIN 단일세션 — 신규 로그인 시 기존 세션 폐기 + jti blacklist
- [x] admin logout 후 access token blacklist 재사용 → 401
- [x] USER 5세션 상한 — 6번째 로그인 시 오래된 세션 삭제

### Swagger / 문서 검증
- [x] SpringDoc Bearer SecurityScheme 등록 ← SwaggerConfig 기존 구현
- [ ] 테스트 계정으로 Swagger Authorize 동작 수동 확인
- [x] checklist.md 전 항목 완료 점검
- [ ] (선택) audit_logs 연계 — admin 로그인/로그아웃 기록

## 별도 처리 — admin-frontend (Issue #281)
- [x] `AdminProtectedRoute` → `adminSession` token + `hasAdminRouteAccess()` 세부 role 검사로 교체 ← PR #384
