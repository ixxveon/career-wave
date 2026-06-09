# Auth / JWT 공통 인증 Spec

> 범위: 사용자 플랫폼(USER / COMPANY)과 관리자 플랫폼(ADMIN)의 공통 JWT 인증 규격.
> 위치: `specs/backend/auth/`
> 브랜치: `docs/backend-auth-jwt-spec`

## 0. User Story

- 일반 사용자(USER)로서, 안전하게 로그인하고 세션을 유지하여 서비스를 이용하고 싶다.
- 기업 사용자(COMPANY)로서, 사용자와 동일한 인증 흐름으로 로그인하되 기업 전용 기능에 접근하고 싶다.
- 관리자(ADMIN)로서, 분리된 보안 정책으로 로그인하고 내 관리자 등급(MASTER/CS/BACKEND)에 맞는 기능만 접근하고 싶다.
- 정지/차단된 사용자로서, 로그인은 막히더라도 내 계정 상태와 제재 사유는 확인하고 싶다.

> Given/When/Then 상세는 각 기능의 FR로 풀지 않고, 본 문서는 인증 인프라의 기술 규격·제약(constitution.md)·계약(api-schema.md) 형태로 기술한다. (auth는 업무 기능이 아닌 공통 기반 모듈이므로)

## 1. 목적

사용자/관리자 로그인 후 JWT를 발급하고, 모든 인증 필요 API에서 토큰을 검증하여 인증 주체를 식별한다. USER / COMPANY / ADMIN 세 주체가 동일한 JWT 인프라를 공유하되, 서명 키와 SecurityFilterChain은 분리한다. 관리자는 admin_role(MASTER/CS/BACKEND)에 따라 관리자 내부 권한을 추가로 구분한다.

## 2. 무엇을 만드는가 (What)

- 사용자 로그인 후 JWT(accessToken / refreshToken) 발급
- 관리자 로그인 후 JWT 발급
- JWT 검증 후 SecurityContext에 인증 정보 저장
- ROLE_USER / ROLE_COMPANY / ROLE_ADMIN 권한 구분
- 관리자 내부 등급(MASTER / CS / BACKEND) 구분 → JWT `adminRole` claim + `@PreAuthorize` 기반 접근 제어
- 인증 필요 API에서 memberId / adminId 조회 (SecurityContext 경유)
- Refresh Token 재발급 (rotation 적용)
- 로그아웃 시 Refresh Token 폐기 + 해당 Access Token 즉시 무효화(Blacklist)
- 계정 상태(ACTIVE / SUSPENDED / BANNED / LOCKED / WITHDRAWN) 기반 로그인 차단
- 인증 필요 API에서 계정 상태 검증(ACTIVE만 허용, `me/status` 예외)
- 정지/차단 계정의 상태·제재 사유 조회 API (`GET /api/v1/user/members/me/status`)
- 로그인 실패 횟수 누적 및 LOCKED 자동 처리
- 테스트 계정으로 Swagger에서 Bearer 인증 테스트 가능

## 3. 인증 주체

| 주체 | role_type / role | 테이블 | PK 타입 |
|---|---|---|---|
| 일반 사용자 | ROLE_USER | members | UUID |
| 기업 사용자 | ROLE_COMPANY | members | UUID |
| 관리자 | ROLE_ADMIN (+ adminRole) | admins | BIGINT(BIGSERIAL) |

> 사용자(USER/COMPANY)는 `members` 한 테이블에서 `role_type`으로 구분된다.
> 관리자는 `admins` 별도 테이블이며 PK 타입이 BIGINT이므로 JWT subject 처리 시 주체 타입 분기가 필요하다.
> 관리자는 기본 권한 `ROLE_ADMIN`에 더해 `admins.admin_role`(MASTER / CS / BACKEND)을 JWT `adminRole` claim으로 실어, 관리자 전용 API 내부에서 등급별 접근 제어를 수행한다.

## 4. 저장 전략 (확정)

- **Refresh Token: Redis 저장.** key `refresh:{accountType}:{subjectId}:{sessionId}`, value = token hash, TTL = refresh 만료시간. 원문 저장 금지, hash 저장. rotation·폐기·만료를 TTL과 key 삭제로 처리.
- **Access Token Blacklist: Redis 저장.** key `blacklist:{jti}`, TTL = Access Token 잔여 수명. 로그아웃 시 현재 access token의 jti를 등록하며, 매 요청 조회한다.
- **로그인 실패 카운트(login_fail_count): Redis 저장.** 고빈도·임시 데이터이며 ERD에 대응 컬럼이 없으므로 Redis로 관리. 로그인 성공 시 초기화.
- **계정 잠금 시각(locked_until): DB 저장.** `members.locked_until` 컬럼 사용. 잠금 상태는 계정의 권위 상태이므로 영속 저장하며, Redis 장애에도 유지되어야 한다.

> `member_refresh_tokens` 테이블은 사용하지 않는다. Refresh 저장·폐기·만료가 모두 Redis로 대체된다. (`password_reset_tokens`는 저빈도 + 사용 이력 추적 목적으로 DB 유지)
> Redis 장애 시 재발급/로그인 실패 처리 → 재로그인 유도. Blacklist 조회 실패 시 관리자는 보수적 거부, 사용자는 설정 가능.

## 5. 계정 상태 정책

- `members.member_status`: ACTIVE / SUSPENDED / BANNED / LOCKED / WITHDRAWN
- `admins.status`: ACTIVE / LOCKED
- ACTIVE만 로그인/토큰 재발급 허용, 그 외 전부 차단.
- JWT 인증 필터는 토큰 진위/만료/blacklist만 검증하고 SecurityContext를 만든다. 계정 상태 검증은 별도 AccountStatus 검증 단계에서 수행한다. (SS-2 참고)
- 인증 필요 API는 기본적으로 계정 상태가 ACTIVE인 주체만 접근 가능하다.
- 예외: `GET /api/v1/user/members/me/status`는 SUSPENDED / BANNED / LOCKED / WITHDRAWN 회원도 유효한 access token이 있으면 접근 가능하다. (로그인 폼 → 고객센터 안내 → 상태 확인 흐름 보장)
- 예외: `POST /api/v1/user/members/logout`은 비ACTIVE 회원도 접근 가능하다. 이미 발급된 refresh/access token을 사용자가 직접 폐기할 수 있어야 한다.
- 제재(SUSPENDED/BANNED/LOCKED/WITHDRAWN) 상태로 변경된 뒤에는 이미 발급된 access token이 남아 있어도 일반 authenticated API 접근은 AccountStatus 검증 단계에서 403으로 차단한다.
- 제재 사유/기간은 `suspend_histories`에서 최근 이력 조회.

## 6. 범위 밖 (Out of Scope)

- 소셜 로그인(OAuth2)
- 관리자 MFA / OTP (2기 증강)
- 관리자 IP 화이트리스트 강제 적용 — `ip_acl` 테이블은 존재하나 이번 spec에선 연계 지점만 명시(적용은 별도 작업)
- OpenAPI(api-spec.json) 자동화 — 수기 spec 단계에서는 제외(필요 시 추후 추가)

## 7. 미해결 / 팀 확인 필요

- [ ] Redis key 네이밍 컨벤션을 조원 spec과 정렬 (prefix 규칙)
- [ ] 관리자 로그인 실패 잠금 기준(횟수/시간) — 본 spec 기본값 5회/15분 적용
- [ ] 다중기기 정책: USER 최대 5세션 / ADMIN 단일 세션 — 확정
- [ ] 관리자 등급별(MASTER/CS/BACKEND) API 접근 매트릭스 — 각 admin 도메인 담당자와 정렬 필요
