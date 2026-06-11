# Auth Checklist (구현 전후 점검)

## 토큰 발급 / 검증
- [x] 로그인 성공 시 accessToken + refreshToken 발급 확인 ← PR #323
- [x] Authorization 헤더 없으면 401 ← PR #351
- [x] 잘못된/위조 token이면 401 ← PR #351
- [x] 만료 token이면 401 ← PR #351
- [x] accessToken 만료시간: 사용자 30분 / 관리자 15분 확인 ← PR #323
- [x] aud claim으로 user/admin 키 교차 사용 차단 확인 ← PR #361
- [x] jti 누락 토큰 fail-closed(인증 거부) 처리 ← PR #361 리뷰 반영

## 권한
- [x] ROLE_USER 토큰으로 admin API(`/api/v1/admin/**`) 접근 → 403 ← PR #351
- [ ] ROLE_ADMIN 토큰으로 사용자 전용 정책 동작 확인
- [ ] ROLE_COMPANY 전용 / ROLE_USER 전용 API 분리 확인 ← Phase 4
- [x] permitAll 목록(로그인/재발급/Swagger) 인증 없이 접근 가능 ← PR #323
- [x] 관리자 토큰에 adminRole(MASTER/CS/BACKEND) claim 포함 확인 ← PR #323
- [x] @EnableMethodSecurity 활성화 + @PreAuthorize 동작 확인 ← PR #323
- [ ] CS 관리자가 BACKEND 전용 API 접근 시 403 (등급별 제어 동작) ← Phase 5

## Refresh / 로그아웃
- [x] refresh token 재발급 성공 ← PR #361
- [x] refresh token은 HttpOnly cookie에서만 수신(body fallback 없음) ← PR #361
- [x] refreshToken cookie Path: user `/api/v1/user/members`, admin `/api/v1/admin/auth` ← PR #361
- [x] refreshToken cookie 삭제 시 발급과 동일한 Path 사용 (Max-Age=0) ← 이번 PR
- [x] refresh token 만료/폐기 시 401 + 재로그인 유도 ← PR #361
- [x] rotation 후 구 refresh token 사용 불가 ← PR #361
- [x] revoked token 재사용 시 전체 세션 폐기(재사용 탐지) ← PR #361
- [x] 로그아웃 후 access token(blacklist) 재사용 차단 ← PR #361
- [x] 로그아웃 후 refresh token 재사용 차단 ← PR #361
- [x] 비ACTIVE 회원도 logout으로 본인 세션 폐기 가능 ← PR #361

## 계정 상태
- [x] SUSPENDED / BANNED / WITHDRAWN / LOCKED 로그인 차단 ← PR #323
- [x] SUSPENDED / BANNED / WITHDRAWN / LOCKED refresh 재발급 차단 ← PR #361
- [ ] SUSPENDED / BANNED / WITHDRAWN / LOCKED 일반 authenticated API 접근 차단 ← Phase 4
- [ ] 로그인 실패 5회 → LOCKED 처리 + locked_until DB 저장 ← Phase 4
- [ ] LOCKED 15분(locked_until) 경과 후 로그인 시 ACTIVE 자동 복구 + 카운트 초기화 ← Phase 4
- [ ] 실패 카운트는 Redis, locked_until은 DB (이중 저장 아님) 확인 ← Phase 4
- [ ] `me/status` 응답에 memberStatus / restriction.reason / startedAt 포함 ← Phase 4
- [ ] 정지/차단 회원도 `me/status` 접근 가능 (AccountStatus 예외 확인) ← Phase 4
- [x] 계정 상태 검증이 JwtAuthenticationFilter가 아닌 별도 AccountStatus 단계에 있음 ← Phase 4에서 구현 예정 (plan.md SS-2)

## 프론트 연동 / 도구
- [x] FE api-schema와 응답 필드명(camelCase) 일치 ← PR #345
- [x] 사용자 로그인 요청의 `roleType`은 필수이며 FE LoginRequest / `useLogin.ts` / MSW `memberHandlers.ts`와 일치 ← PR #345
- [ ] Swagger에서 Bearer token Authorize로 인증 API 테스트 가능 ← Phase 6
- [ ] 테스트 계정으로 전체 로그인→호출 플로우 검증 ← Phase 6

## 코드 규칙 점검
- [ ] Controller에서 token 직접 파싱 없음 (@AuthenticationPrincipal 사용)
- [x] refresh token Redis hash 저장(원문 저장 없음) ← PR #361
- [x] access token 영속 저장 없음 (blacklist는 로그아웃 전용) ← PR #361
- [ ] locked_until은 DB 저장, 실패 카운트는 Redis ← Phase 4
- [x] `member_refresh_tokens` 테이블 미사용 ← PR #361
- [x] user/admin 패키지 직접 참조 없음
