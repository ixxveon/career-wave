# Auth 구현 TODO (로컬 전용)
> 이 파일은 로컬 전용입니다. GitHub에 업로드되지 않습니다.
> 기준 브랜치: feature/backend-auth-redis-refresh-logout (PR #355)
> 작성일: 2026-06-11

---

## PR 1 — Phase 3 : Refresh / Logout / Blacklist
**브랜치**: `feature/auth-phase3-refresh-logout` (베이스: feature/backend-auth-redis-refresh-logout)
**관련 이슈**: #340, #339
**상태**: PR #361 MERGED ✅

### 선처리 — PR #323 이월
- [x] `Admin.java` — `@NoArgsConstructor(access = AccessLevel.PROTECTED)` + Lombok import
- [x] `UserLoginServiceImpl` — LOCKED 복구 시 `member.recoverFromLock()` → DB 저장 (dirty checking)
- [x] `UserLoginServiceImpl` — `validateAccountStatus()` 반환값으로 중복 호출 제거

### 인프라
- [x] `build.gradle` — `spring-boot-starter-data-redis` 추가
- [x] `application.yml` / `application-local.yml` — Redis 연결 설정
- [x] `auth/store/` 패키지 생성
- [x] `RefreshTokenStore` — key `refresh:{accountType}:{subjectId}:{sessionId}`, SHA-256 hash, TTL, rotation, 재사용 탐지, 세션 상한
- [x] `TokenBlacklistStore` — key `blacklist:{jti}`, TTL = access token 잔여 수명

### JwtTokenProvider 개선 (Issue #339 포함)
- [x] **[#339 fix]** roleType claim 형식 통일 — `USER`/`COMPANY`/`ADMIN` (ROLE_ prefix 없이 저장, AuthPrincipal에서만 부여)
- [x] refresh token에 `sessionId` claim 추가 (UUID)
- [x] access/refresh token에 `aud` claim 추가 — `"user"` / `"admin"`
- [x] `parse()` 시 `aud` claim 검증 적용
- [x] clock skew leeway 30~60초 적용
- [x] `AuthErrorCode` — `AUTH_REFRESH_REUSE_DETECTED` (401) 추가

### Refresh / Logout
- [x] `UserLoginService` 로그인 시 `RefreshTokenStore`에 저장 (sessionId 포함)
- [x] `POST /api/v1/user/members/token/refresh` 개선
  - rotation (같은 sessionId key 새 hash로 교체)
  - 재사용 탐지 (key 없음/hash 불일치) → 전체 세션 폐기 + 401
  - USER 5세션 상한 (초과 시 오래된 세션 삭제)
  - 비ACTIVE 차단
  - body fallback 없음 (cookie only)
- [x] `POST /api/v1/user/members/logout`
  - refresh Redis key 삭제
  - access jti blacklist 등록
  - 비ACTIVE 회원도 허용
- [x] `POST /api/v1/admin/auth/logout`
  - admin refresh Redis key 삭제 + access jti blacklist
- [x] `JwtAuthenticationFilter` — blacklist jti 조회 추가 (blacklist 등록된 jti → 401)

### 테스트
- [x] roleType claim 로그인/refresh 동일 형식 검증 (Issue #339)
- [x] rotation 성공, 구 refresh 사용 차단
- [x] 재사용 탐지 → 전체 세션 폐기 + 401
- [ ] USER 5세션 상한 → 오래된 세션 삭제
- [ ] ADMIN 단일 세션 → 신규 로그인 시 기존 세션 폐기
- [x] body refreshToken 거부 (cookie only) — endpoint에 body 파라미터 없으므로 구조적으로 충족
- [x] 비ACTIVE 재발급 차단
- [x] user logout 후 access token (blacklist) 재사용 → 401
- [x] user logout 후 refresh token 재사용 → 401
- [ ] admin logout 후 access token (blacklist) 재사용 → 401
- [x] 비ACTIVE 회원 logout 허용

---

## PR 2 — Phase 4 : AccountStatus / LoginAttempt / me/status
**브랜치**: `feature/auth-phase4-account-status`
**상태**: 구현 완료, 테스트 통과 (PR 준비 중)

### 인프라
- [x] `LoginAttemptStore` (Redis 실패 카운트, key `login:fail:{accountType}:{loginKey}`)
- [x] 로그인 실패 5회 → `members.member_status = LOCKED` + `locked_until = now() + 15분` DB 저장
- [x] LOCKED 자동 복구: `locked_until` 경과 시 ACTIVE + 카운트 초기화

### 필터 / 권한
- [x] `AccountStatusAuthorizationFilter` 구현
  - ACTIVE만 통과, SUSPENDED/BANNED/WITHDRAWN→403, LOCKED→423
  - 예외 경로: `GET /me/status`, `POST /logout (user+admin)`
  - `AccountStatusPort` 인터페이스로 global→domain 직접 참조 방지
- [x] `ROLE_USER` / `ROLE_COMPANY` 전용 API 접근 제어 추가

### API
- [x] `GET /api/v1/user/members/me/status`
  - memberStatus + restriction(reason, startedAt, duration, recoverable) 포함
  - suspend_histories 최근 이력 native query 조인
- [x] logout cookie Max-Age=0 클리어 (spec 누락 수정)

### 테스트
- [x] 로그인 실패 5회 → LOCKED + locked_until DB 저장
- [x] LOCKED 자동 복구 후 로그인 성공
- [x] 비ACTIVE 로그아웃 허용 (기존 Phase 3 테스트 커버)
- [ ] SUSPENDED/BANNED/WITHDRAWN 일반 API 403 차단 ← AccountStatusAuthorizationFilter 통합 테스트 미작성
- [ ] 정지 회원 me/status 접근 가능 ← 통합 테스트 미작성

---

## PR 3 — Phase 5 : Admin Auth 완성 + Swagger / 문서
**브랜치**: `feature/auth-phase5-admin-swagger` (베이스: PR 2 브랜치)
**상태**: 구현 완료, PR 준비 중

### Admin auth
- [ ] `AdminLoginService` `last_login_ip` 갱신 ← Admin entity에 컬럼 없음; ERD 확인 후 결정
- [x] 단일 세션 정책 + RefreshTokenStore 저장 ← PR #361 선처리
- [x] `POST /api/v1/admin/auth/refresh` — rotation + admins.status 검증 ← PR #361 선처리
- [x] AuthPrincipal에 ROLE_MASTER/CS/BACKEND authority 추가
- [x] adminRole(MASTER/CS/BACKEND) @PreAuthorize 적용 (프론트 access matrix 기준)
- [x] 관리자 로그인 실패 잠금 5회 — LoginAttemptStore ADMIN 연동

### 테스트
- [x] admin 5회 실패 → LOCKED, 성공 시 카운터 초기화
- [x] ADMIN 단일세션 — 신규 로그인 시 기존 세션 폐기 + jti blacklist
- [x] admin logout 후 access token blacklist 재사용 → 401
- [x] USER 5세션 상한 — 6번째 로그인 시 오래된 세션 삭제

### Swagger / 문서
- [x] SpringDoc Bearer SecurityScheme 등록 ← SwaggerConfig 기존 구현
- [ ] Swagger Authorize 수동 동작 확인
- [x] checklist.md 전 항목 완료 점검

---

## 별도 PR — Issue #281 (admin-frontend)
**상태**: PR #384 MERGED ✅
- [x] `AdminProtectedRoute` → `adminSession.getToken()` / `adminSession.getRole()` 기반으로 교체
- [x] `hasAdminRouteAccess(currentAdminRole, path)` 적용
- [x] `localStorage.accessToken` 의존 제거
- [x] token 있음 + role null → 세션 정리 후 login redirect (redirect loop 방지)
- [x] role별 route 접근 테스트 추가
