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
- [ ] AccountStatusAuthorizationFilter/Guard 골격 (일반 authenticated API는 ACTIVE만 허용, 예외 경로 분리) ← Phase 4로 이월
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
- [ ] USER 5세션 상한 → 오래된 세션 삭제 ← 테스트 미작성
- [ ] ADMIN 단일 세션 → 신규 로그인 시 기존 세션 폐기 ← 테스트 미작성
- [x] logout 후 access token(blacklist) 재사용 → 401
- [x] logout 후 refresh token 재사용 → 401 (재사용 탐지로 간접 커버)
- [ ] admin logout 후 access token(blacklist) 재사용 → 401 ← 테스트 미작성

## Phase 4: Security filter + 권한 처리
> `TokenBlacklistStore` / logout endpoint는 Phase 3에서 구현 완료. Phase 4는 계정 상태 필터·권한 제어·me/status에 집중.
- [ ] LoginAttemptStore (Redis 실패 카운트) + locked_until DB 저장 (5회→LOCKED+locked_until 15분)
- [ ] 잠금 자동 복구 (locked_until 경과 시 ACTIVE 복구 + 카운트 초기화)
- [ ] 계정 상태 검증 통합 (로그인/refresh/일반 authenticated API는 ACTIVE만 허용, 상태별 403/423)
- [ ] JwtAuthenticationFilter ↔ TokenBlacklistStore 연동 확인 (Phase 3에서 구현한 store 기반 blacklist 조회 동작 검증)
- [ ] ROLE_USER / ROLE_COMPANY 전용 API 접근 제어 (requestMatchers().hasRole())
- [ ] GET /api/v1/user/members/me/status (suspend_histories 최근 이력 조인, AccountStatus 예외로 정지 회원도 접근 가능 확인)
- [ ] 테스트: 상태별 차단 / 비ACTIVE 일반 API 403 / LOCKED 자동잠금 / 로그아웃 후 토큰 재사용 차단 / 정지 회원 me/status 접근 / 비ACTIVE logout 허용 / 권한 매트릭스

## Phase 5: Admin auth 연결
> `POST /api/v1/admin/auth/logout`은 Phase 3에서 구현 완료. Phase 5는 단일 세션 정책 고도화·adminRole 권한·실패 잠금에 집중.
- [ ] adminSecurityFilterChain (@Order(1), admin secret, hasRole("ADMIN"), addFilterBefore)
- [ ] AdminLoginService (admins 조회·status 검증·last_login_ip 갱신·adminRole claim 포함)
- [x] POST /api/v1/admin/auth/login (응답에 adminRole 포함) ← PR #361 선처리
- [x] POST /api/v1/admin/auth/refresh (단일 세션 정책, HttpOnly cookie only) ← PR #361 선처리
- [x] refreshToken Set-Cookie Path `/api/v1/admin/auth` 적용 및 삭제 시 동일 Path 사용 ← PR #361 + 이번 PR
- [ ] adminRole(MASTER/CS/BACKEND) 권한 표현식 + @PreAuthorize 적용 기반 마련
- [ ] 관리자 실패 잠금(5회) 적용
- [ ] 테스트: admin 로그인/재발급/권한 격리(USER 토큰으로 admin API→403) / adminRole별 접근 제어

## 별도 처리 — admin-frontend (Issue #281)
- [x] `AdminProtectedRoute` → `adminSession` token + `hasAdminRouteAccess()` 세부 role 검사로 교체 ← PR #384

## Phase 6: Swagger / Test / 문서 검증
- [ ] SpringDoc Bearer SecurityScheme 등록
- [ ] 테스트 계정으로 Swagger Authorize 동작 확인
- [ ] api-schema.md ↔ 실제 응답 필드명 일치 검증
- [ ] checklist.md 전 항목 점검
- [ ] (선택) audit_logs 연계 — admin 로그인/로그아웃 기록
