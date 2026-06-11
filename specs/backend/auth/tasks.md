# Auth 작업 목록 (Tasks)

> 원칙: 세로 슬라이스(한 주체 end-to-end 먼저 관통 후 확장). 각 Phase는 자체 테스트 포함.

## Phase 1: JWT 설정 / 유틸
- [ ] global/auth 패키지 구조 생성
- [ ] JwtProperties (user/admin secret·issuer·aud·access/refresh 만료 분리)
- [ ] JwtTokenProvider 생성 (accountType별 키 선택, leeway 적용)
- [ ] Access/Refresh 생성·검증 로직 + 단위 테스트(서명/만료/위조)
- [ ] PasswordEncoder(BCrypt) Bean
- [ ] AuthErrorCode enum
- [ ] 공통 ErrorResponse DTO + @RestControllerAdvice
- [ ] AuthenticationEntryPoint(401) / AccessDeniedHandler(403)

## Phase 2: User login + token 발급
- [ ] AuthPrincipal 정의 (adminRole 필드 포함, 사용자는 null)
- [ ] JwtAuthenticationFilter (Bearer 추출 → 검증 → SecurityContext 저장, 상태 검증은 AccountStatus 단계로 분리)
- [ ] userSecurityFilterChain 골격 (CSRF off, STATELESS, CORS, addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class))
- [ ] @EnableMethodSecurity 활성화 (이후 @PreAuthorize 대비)
- [ ] AccountStatusAuthorizationFilter/Guard 골격 (일반 authenticated API는 ACTIVE만 허용, 예외 경로 분리)
- [ ] UserLoginService (조회·hash 비교·상태 검증, `roleType` 필수 검증)
- [ ] POST /api/v1/user/members/login
- [ ] LoginResponse DTO (member 포함, camelCase)
- [ ] FE LoginRequest / `useLogin.ts` / MSW `memberHandlers.ts`의 `roleType` 전송 계약 확인
- [ ] 통합 테스트: 토큰 없음→401, 유효 토큰→200, 로그인 성공→accessToken 발급, `roleType` 누락/오류 검증

## Phase 3: Refresh token 저장 / 재발급
- [ ] RefreshTokenStore (Redis, key `refresh:{accountType}:{subjectId}:{sessionId}`, hash 저장 + TTL)
- [ ] POST /api/v1/user/members/token/refresh (HttpOnly cookie only, body fallback 없음)
- [ ] rotation 적용 (같은 sessionId key 새 hash로 교체, TTL 갱신)
- [ ] 재사용 탐지 (key 없음/hash 불일치) → 전체 세션 폐기 + 401
- [ ] USER 5세션 상한 처리 (초과 시 최오래 세션 삭제 + access jti blacklist)
- [ ] refreshToken Set-Cookie Path `/api/v1/user/members` 적용 및 삭제 시 동일 Path 사용
- [ ] 테스트: 재발급 성공 / body refreshToken 거부 / 만료·폐기 401 / 비ACTIVE 재발급 차단 / 재사용 탐지 / 세션 상한

## Phase 4: Security filter + 권한 처리
- [ ] LoginAttemptStore (Redis 실패 카운트) + locked_until DB 저장 (5회→LOCKED+locked_until 15분)
- [ ] 잠금 자동 복구 (locked_until 경과 시 ACTIVE 복구 + 카운트 초기화)
- [ ] 계정 상태 검증 통합 (로그인/refresh/일반 authenticated API는 ACTIVE만 허용, 상태별 403/423)
- [ ] TokenBlacklistStore (Redis, 로그아웃 전용) + Filter 연동
- [ ] POST /api/v1/user/members/logout (refresh Redis key 삭제 + access jti blacklist, 비ACTIVE 회원도 허용)
- [ ] ROLE_USER / ROLE_COMPANY 전용 API 접근 제어 (requestMatchers().hasRole())
- [ ] GET /api/v1/user/members/me/status (suspend_histories 최근 이력 조인, AccountStatus 예외로 정지 회원도 접근 가능 확인)
- [ ] 테스트: 상태별 차단 / 비ACTIVE 일반 API 403 / LOCKED 자동잠금 / 로그아웃 후 토큰 재사용 차단 / 정지 회원 me/status 접근 / 비ACTIVE logout 허용 / 권한 매트릭스

## Phase 5: Admin auth 연결
- [ ] adminSecurityFilterChain (@Order(1), admin secret, hasRole("ADMIN"), addFilterBefore)
- [ ] AdminLoginService (admins 조회·status 검증·last_login_ip 갱신·adminRole claim 포함)
- [ ] POST /api/v1/admin/auth/login (응답에 adminRole 포함)
- [ ] POST /api/v1/admin/auth/refresh (단일 세션 정책, HttpOnly cookie only)
- [ ] POST /api/v1/admin/auth/logout + blacklist
- [ ] refreshToken Set-Cookie Path `/api/v1/admin/auth` 적용 및 삭제 시 동일 Path 사용
- [ ] adminRole(MASTER/CS/BACKEND) 권한 표현식 + @PreAuthorize 적용 기반 마련
- [ ] 관리자 실패 잠금(5회) 적용
- [ ] 테스트: admin 로그인/재발급/권한 격리(USER 토큰으로 admin API→403) / adminRole별 접근 제어

## Phase 6: Swagger / Test / 문서 검증
- [ ] SpringDoc Bearer SecurityScheme 등록
- [ ] 테스트 계정으로 Swagger Authorize 동작 확인
- [ ] api-schema.md ↔ 실제 응답 필드명 일치 검증
- [ ] checklist.md 전 항목 점검
- [ ] (선택) audit_logs 연계 — admin 로그인/로그아웃 기록
