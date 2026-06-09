# Auth 구현 Plan (How)

## 1. 패키지 구조

```
global/auth/
├── jwt/         JwtTokenProvider, JwtProperties
├── filter/      JwtAuthenticationFilter, AccountStatusAuthorizationFilter
├── principal/   AuthPrincipal (CustomUserDetails 대체)
├── config/      SecurityConfig (단일 FilterChain, Role 기반), SwaggerConfig
├── exception/   AuthErrorCode, AuthExceptionHandler, EntryPoint, AccessDeniedHandler
└── store/       RefreshTokenStore(Redis), TokenBlacklistStore(Redis), LoginAttemptStore(Redis)

user/auth/       UserLoginService, UserAuthController
admin/auth/      AdminLoginService, AdminAuthController
```

> 규칙: user 패키지와 admin 패키지는 서로 직접 참조 금지. 공통 로직은 global/auth로.

## 2. 핵심 컴포넌트

### JwtTokenProvider
- accountType(USER/COMPANY/ADMIN)에 따라 user/admin secret 선택.
- `createAccess(principal)`, `createRefresh(principal)`, `parse(token)`, `validate(token)`.
- claim: sub, accountType, roleType, roles, jti, aud, iat, exp. 관리자 토큰에는 `adminRole`(MASTER/CS/BACKEND) 추가.
- 검증 시 aud와 서명 키 일치 확인(키 분리). clock skew leeway 적용.

### JwtAuthenticationFilter
- `OncePerRequestFilter` 상속.
- 흐름: Authorization 헤더에서 Bearer 추출 → 서명/만료/위조 검증 → **Blacklist(jti) 조회(Redis)** → accountType별 주체 조회 → AuthPrincipal 생성(관리자는 adminRole 포함) → Authentication 만들어 SecurityContext 저장.
- 토큰 없으면 그대로 통과(다음 단계에서 EntryPoint가 401 처리). 위조/만료/blacklist면 EntryPoint로 401.
- **[SS-2] 계정 상태(ACTIVE/SUSPENDED/...) 검증을 이 필터에 넣지 않는다.** 이 필터는 토큰 진위·만료·blacklist와 인증 주체 구성만 담당한다. 상태 검증은 아래 AccountStatusAuthorizationFilter에서 수행한다.

### AccountStatusAuthorizationFilter
- `JwtAuthenticationFilter` 이후 실행한다.
- SecurityContext의 AuthPrincipal을 기준으로 DB 권위 상태(`members.member_status`, `admins.status`)를 조회한다.
- 기본 정책: 인증 필요 API는 ACTIVE 상태만 통과한다. SUSPENDED / BANNED / LOCKED / WITHDRAWN 회원, LOCKED 관리자는 403(또는 LOCKED는 423)으로 차단한다.
- 예외 경로:
  - `GET /api/v1/user/members/me/status`: 비ACTIVE 회원도 자신의 상태·제재 사유 조회 가능.
  - `POST /api/v1/user/members/logout`: 비ACTIVE 회원도 본인 세션 폐기 가능.
- refresh 재발급은 permitAll이지만 refresh token 검증 후 새 토큰 발급 전 계정 상태를 확인한다. 비ACTIVE 상태면 재발급하지 않는다.

### AuthPrincipal
- 공통 인증 주체 표현. 필드: id(String — UUID or BIGINT 문자열), accountType, roleType, authorities, adminRole(관리자만, 그 외 null).
- Controller에서는 `@AuthenticationPrincipal AuthPrincipal`로만 주체 조회(토큰 직접 파싱 금지).

### SecurityConfig — 단일 FilterChain (Role 기반)
- **단일 `SecurityFilterChain` 빈**으로 user/admin 요청을 함께 처리한다. `@Order`나 `securityMatcher`로 체인을 분리하지 않는다.
- 기존 user 쪽 JWT 코드(`JwtTokenProvider`, `JwtAuthenticationFilter`)를 admin에서도 그대로 재사용하고, `roleType`(USER/COMPANY/ADMIN)으로 접근을 구분한다.
- CSRF disable, 세션 STATELESS, CORS 설정(아래 CORS 항목), EntryPoint/AccessDeniedHandler 등록.
- **[SS-1] JwtAuthenticationFilter 등록**: `http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)`로 단일 등록. (폼 로그인 필터보다 먼저 JWT 인증 처리)
- 권한:
  - permitAll: api-schema 8번 목록.
  - `/api/v1/admin/**` → `hasRole("ADMIN")` — URL 경로 단위 굵은 권한은 SecurityConfig에서 집중 관리.
  - `/api/v1/user/members/me/status`: **authenticated + AccountStatus 예외**. 정지/차단 회원도 유효 토큰이면 통과.
  - `/api/v1/user/members/logout`: **authenticated + AccountStatus 예외**. 정지/차단 회원도 본인 세션 폐기 가능.
- **[SS-3] 관리자 등급(MASTER/CS/BACKEND) 세분 권한**: 메서드 단위 `@PreAuthorize`로 처리한다. 이를 위해 설정 클래스에 `@EnableMethodSecurity`를 **반드시** 추가한다(누락 시 어노테이션이 조용히 무시됨).
  - 예: `@PreAuthorize("hasRole('ADMIN') and @authz.hasAdminRole('BACKEND')")` 또는 커스텀 권한 표현식. adminRole은 AuthPrincipal/Authentication authority로 노출.
  - 등급별 접근 매트릭스는 spec.md 7번(팀 정렬 필요) 확정 후 각 admin API에 적용.
  - 세분 권한 설계는 admin 페이지 담당자와 협의 후 확정한다.

### RefreshTokenStore (Redis)
- key: `refresh:{accountType}:{subjectId}:{sessionId}`, value = token hash(SHA-256), TTL = refresh 만료시간.
- 발급 시: sessionId(UUID) 생성 → key에 hash 저장(TTL 설정).
- 재발급 시: 요청 refresh의 (subjectId, sessionId)로 key 조회 → 저장된 hash와 비교 → 일치하면 신규 발급(rotation: 같은 sessionId key를 새 hash로 덮어쓰기 + TTL 갱신).
- **rotation**: 새 refresh 발급 시 기존 key를 새 값으로 교체. 구 refresh는 더 이상 매칭 안 됨.
- **재사용 탐지**: 요청 refresh가 유효 서명·미만료인데 Redis key가 없거나 hash 불일치 → 이미 회전/폐기된 토큰의 재사용으로 간주 → 해당 subjectId의 모든 `refresh:*:{subjectId}:*` key 삭제(전체 세션 폐기) + 401 REUSE_DETECTED.
- **다중기기**: sessionId 단위로 key가 분리되므로 자연스럽게 다중 세션 지원.
  - USER/COMPANY: `refresh:{accountType}:{subjectId}:*` 활성 key 5개 상한. 초과 시 가장 오래된 세션 key 삭제 + 해당 access jti를 blacklist 등록.
  - ADMIN: 단일 세션. 신규 로그인 시 기존 `refresh:ADMIN:{adminId}:*` 전부 삭제 후 새 세션 생성.
- 로그아웃: 해당 sessionId key 삭제 + 현재 access jti blacklist 등록.
- refresh 재발급 요청은 HttpOnly cookie로만 받는다. body fallback은 허용하지 않는다.

### TokenBlacklistStore (Redis)
- 로그아웃 시 현재 accessToken의 jti를 `blacklist:{jti}`로 저장, TTL = 잔여 만료시간.
- Filter에서 매 요청 조회.

### LoginAttemptStore (Redis 실패 카운트) + 잠금 상태(DB)
- **실패 카운트**: Redis key `login:fail:{accountType}:{loginKey}`. 실패 시 INCR, 성공 시 DEL. (고빈도·임시 데이터, ERD 컬럼 없음)
- **5회 도달 시**: `members.member_status = LOCKED` 갱신 + `members.locked_until = now() + 15분` **DB에 저장**.
- **로그인 시 검증**: DB의 member_status가 LOCKED이고 `locked_until > now()`이면 차단. `locked_until <= now()`(경과)이면 첫 시도에서 ACTIVE 자동 복구 + locked_until NULL + Redis 실패 카운트 초기화.
- 잠금 상태는 계정 권위 상태이므로 DB(`locked_until`)가 단일 진실 소스. Redis는 실패 횟수 카운팅에만 사용(이중 저장 아님).

## 3. 로그인 서비스

### UserLoginService
1. loginId로 members 조회 (없어도 동일 메시지).
2. PasswordEncoder.matches로 hash 비교.
3. member_status ACTIVE 검증 (그 외 차단).
4. 실패 카운트 처리 / 성공 시 초기화 + last_login_at 갱신.
5. accessToken + refreshToken 발급, refresh를 Redis에 저장(sessionId 단위).

### UserRefreshService
1. HttpOnly cookie에서 refreshToken 추출(body fallback 없음).
2. refresh token 서명/만료 검증 + Redis hash 비교 + rotation/reuse 탐지.
3. member_status ACTIVE 검증. ACTIVE가 아니면 새 access/refresh token을 발급하지 않는다.
4. accessToken + 새 refreshToken 발급, 같은 sessionId Redis key를 새 hash로 교체.

### AdminLoginService
- email로 admins 조회, password_hash 비교, status ACTIVE 검증.
- last_login_at / last_login_ip 갱신. (audit_logs 연계는 checklist 참고)
- ADMIN 토큰 발급(admin secret, 15분/1일). **admin_role(MASTER/CS/BACKEND)을 `adminRole` claim으로 토큰에 포함.**

### AdminRefreshService
- HttpOnly cookie에서 refreshToken 추출(body fallback 없음).
- refresh token 검증 후 admins.status ACTIVE 검증. ACTIVE가 아니면 새 토큰을 발급하지 않는다.
- ADMIN 단일 세션 정책에 맞춰 rotation 처리.

## 4. CORS
- 사용자/관리자 두 프론트 도메인을 allowed origins로 등록(구체 값은 `application.yml` 또는 CorsConfig에서 관리).
- allowed methods: GET/POST/PUT/PATCH/DELETE/OPTIONS.
- allowed headers: Authorization, Content-Type.
- exposed headers: Authorization (재발급 토큰을 헤더로 내릴 경우).
- allowCredentials 및 구체 도메인 값은 팀 환경(로컬/스테이징/운영)별로 분리.

## 5. 예외 처리
- `AuthErrorCode` enum으로 코드/메시지/HTTP status 정의.
- 인증 실패(미인증/위조/만료/blacklist) → 401, EntryPoint에서 공통 응답.
- 권한 없음(role 불일치 / adminRole 부족) → 403, AccessDeniedHandler.
- 계정 상태 차단 → 403 + 상태별 코드.
- 응답 래핑은 팀 표준(`ApiResponse`) 확정 후 EntryPoint/AccessDeniedHandler/Advice에서 통일 적용 (api-schema 상단 확인 필요 항목).

## 6. Swagger
- SpringDoc `SecurityScheme` Bearer 등록 → Swagger UI에서 Authorize 버튼으로 토큰 입력.
- 테스트 계정으로 로그인 → accessToken 복사 → Authorize → 인증 필요 API 호출 가능.
