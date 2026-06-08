# Auth Constitution (위반 불가 규칙)

## 보안 원칙
- password는 반드시 hash 비교 (PasswordEncoder.matches). 평문 비교 금지.
- accessToken은 어디에도 영속 저장하지 않는다. (무효화는 Redis blacklist의 jti로 처리)
- refreshToken은 원문 저장 금지, **Redis에 hash(SHA-256) 저장** (TTL = 만료시간).
- JWT 만료 / 위조 / blacklist → 401, 권한 없음 → 403. 둘을 섞지 않는다.
- Access Token Blacklist는 **로그아웃 시에만** 등록한다. 제재/정지는 blacklist를 쓰지 않고 `member_status` 변경으로 처리한다(다음 로그인 시 차단).
- 로그인 실패 시 계정 존재 여부가 노출되지 않도록 **공통 메시지** 반환.
- 사용자 secret과 관리자 secret은 **분리**한다. (aud claim으로 교차 사용 차단)

## 아키텍처 원칙
- Controller에서 token을 직접 파싱하지 않는다. 인증 주체는 **SecurityContext / @AuthenticationPrincipal**에서만 가져온다.
- user 패키지와 admin 패키지는 서로 직접 참조하지 않는다. 공통 로직은 global/auth에 둔다.
- SecurityFilterChain은 user / admin 두 개로 분리한다.
- 세션은 STATELESS. 서버 세션 저장 금지.
- **계정 상태 검증은 JwtAuthenticationFilter에 넣지 않는다.** 필터는 토큰 진위·만료·blacklist만 검증. 상태 검증은 로그인 서비스에서만. (정지 회원의 `me/status` 접근 보장)
- 관리자 등급(MASTER/CS/BACKEND) 세분 권한은 `@PreAuthorize`로 처리하며, 이를 위해 `@EnableMethodSecurity`를 반드시 활성화한다.

## 데이터 원칙
- refresh token 및 access token blacklist, 로그인 실패 카운트는 Redis. refresh token은 원문 금지, hash 저장.
- **계정 잠금 시각(`locked_until`)은 DB에 저장한다.** 잠금은 계정 권위 상태이므로 영속 보관(Redis 장애에도 유지). 실패 횟수만 Redis로 카운팅.
- DB는 권위 상태(member_status / admins.status / locked_until)를 보유한다.
- refresh token rotation 시 구 토큰은 즉시 무효(Redis key 교체). 회전/폐기된 토큰 재사용은 탈취로 간주하고 전체 세션 폐기.
- `member_refresh_tokens` 테이블은 사용하지 않는다. (`password_reset_tokens`는 DB 유지)
- PK 타입: members = UUID, admins = BIGINT. JWT subject 처리 시 타입을 혼동하지 않는다.

## 상태 원칙
- 로그인 허용은 ACTIVE 상태에 한한다.
- 정지/차단(SUSPENDED/BANNED/LOCKED/WITHDRAWN) 계정은 로그인 차단하되, `me/status`로 사유 확인은 허용한다.
