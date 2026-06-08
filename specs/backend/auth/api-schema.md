# Auth API Schema (FE ↔ BE 계약)

> 응답 필드 규칙: **camelCase** (프론트 정렬).
> 모든 인증 필요 API: `Authorization: Bearer {accessToken}`
> 공통 응답 포맷: `ApiResponse<T>` (`{ success, statusCode, message, data }`)

---

## 1. 사용자 로그인

`POST /api/v1/user/members/login` — 인증 불필요(permitAll)

**Request**
```json
{ "loginId": "string", "password": "string", "memberType": "USER" }
```

> `memberType`: `USER` / `COMPANY`

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "eyJ...",
    "member": {
      "memberId": "uuid",
      "loginId": "string",
      "name": "string",
      "memberType": "USER",
      "memberStatus": "ACTIVE",
      "subscriptionStatus": "FREE",
      "companyApprovalStatus": "NONE",
      "lastLoginAt": "2026-06-09T12:00:00Z"
    }
  }
}
```

> `refreshToken`은 응답 body가 아닌 **Set-Cookie 헤더**로 전달한다.
> `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/user/members/token`
>
> `companyApprovalStatus` 변환 규칙: `ROLE_USER`는 항상 `NONE`. `ROLE_COMPANY`는 `hr_managers.hr_status` 기준 — `PENDING`→`PENDING_REVIEW`, `ACTIVE`→`APPROVED`, `REMOVED`→`REJECTED`.

**Error**
- 401 `AUTH_INVALID_CREDENTIALS` — 아이디/비밀번호 불일치 (계정 존재 여부 비노출, 공통 메시지)
- 403 `AUTH_ACCOUNT_SUSPENDED` / `AUTH_ACCOUNT_BANNED` / `AUTH_ACCOUNT_WITHDRAWN`
- 423 `AUTH_ACCOUNT_LOCKED` — 로그인 실패 5회 누적 잠금

---

## 2. 토큰 재발급

`POST /api/v1/user/members/token/refresh` — 인증 불필요(permitAll)

**Request**

> refreshToken은 HttpOnly cookie에서 자동 전달. cookie 사용 불가 환경에서는 body로 전달 가능.

```json
{ "refreshToken": "eyJ..." }
```

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "토큰이 갱신되었습니다.",
  "data": {
    "accessToken": "eyJ..."
  }
}
```

> rotation 적용: 새 refreshToken은 **Set-Cookie 헤더**로 재발급. 기존 Redis key는 새 hash로 교체되어 무효화.

**Error**
- 401 `AUTH_REFRESH_INVALID` — 위조/만료/폐기됨 → 재로그인 유도
- 401 `AUTH_REFRESH_REUSE_DETECTED` — 이미 폐기된 토큰 재사용(탈취 의심) → 해당 회원 전체 세션 폐기

---

## 3. 계정 상태 조회 (정지/차단 고객센터 화면용)

`GET /api/v1/user/members/me/status` — 인증 필요(Bearer)

> 제재는 access token을 blacklist에 넣지 않으므로, 유효한 토큰은 인증 필터를 통과한다. 계정 상태 검증은 로그인 시점에만 수행하므로 별도 우회 로직 불필요 — plan.md(SS-2) 참고.

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "memberId": "uuid",
    "memberType": "USER",
    "memberStatus": "SUSPENDED",
    "companyApprovalStatus": "NONE",
    "restriction": {
      "restrictionType": "SUSPENDED",
      "recoverable": true,
      "availableAt": "2026-06-16T00:00:00Z",
      "messageCode": "ACCOUNT_RESTRICTED"
    }
  }
}
```

> ACTIVE 회원이면 `restriction`은 `null`.

**필드 매핑 (DB → 응답)**

| 응답 필드 | 출처 |
|---|---|
| memberId | members.member_id |
| memberType | members.role_type → `ROLE_USER`→`USER`, `ROLE_COMPANY`→`COMPANY` |
| memberStatus | members.member_status |
| companyApprovalStatus | hr_managers.hr_status → `PENDING_REVIEW` / `APPROVED` / `REJECTED`. ROLE_USER는 `NONE` |
| restriction.restrictionType | members.member_status |
| restriction.recoverable | SUSPENDED / LOCKED → `true`, BANNED / WITHDRAWN → `false` |
| restriction.availableAt | LOCKED: members.locked_until, SUSPENDED: suspend_histories.end_date (NULL = 영구정지) |
| restriction.messageCode | 고정값 `"ACCOUNT_RESTRICTED"` |

---

## 4. 관리자 로그인

`POST /api/v1/admin/auth/login` — 인증 불필요(permitAll)

**Request**
```json
{ "email": "string", "password": "string" }
```

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "eyJ...",
    "admin": {
      "adminId": 1,
      "email": "string",
      "name": "string",
      "adminRole": "MASTER",
      "status": "ACTIVE"
    }
  }
}
```

> `refreshToken`은 **Set-Cookie 헤더**로 전달.
> `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/admin/auth/token`

**Error**
- 401 `AUTH_INVALID_CREDENTIALS`
- 423 `AUTH_ACCOUNT_LOCKED`

---

## 5. 관리자 토큰 재발급

`POST /api/v1/admin/auth/refresh` — 인증 불필요(permitAll)

요청/응답 구조는 사용자 재발급(2번)과 동일. 단 만료/키는 관리자 정책 적용(아래 7번).

---

## 6. 로그아웃

`POST /api/v1/user/members/logout` — 인증 필요(Bearer)
`POST /api/v1/admin/auth/logout` — 인증 필요(Bearer)

**Request Body**: 없음 (refreshToken은 cookie에서 자동 추출)

**처리**
- cookie의 refreshToken에 해당하는 Redis 세션 key 삭제 (해당 기기 세션만 폐기)
- 현재 accessToken의 jti를 `blacklist:{jti}`에 등록, TTL = access token 잔여 수명
- Set-Cookie로 refreshToken cookie 만료 처리 (`Max-Age=0`)

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그아웃 되었습니다.",
  "data": null
}
```

**Error**
- 401 `AUTH_UNAUTHENTICATED` — 유효한 access token 없음

---

## 7. JWT Payload 규격

| claim | 사용자 | 관리자 | 설명 |
|---|---|---|---|
| sub | memberId(UUID) | adminId(BIGINT 문자열) | 주체 식별자 |
| accountType | USER / COMPANY | ADMIN | 주체 타입 분기용 |
| roleType | ROLE_USER / ROLE_COMPANY | ROLE_ADMIN | 권한 |
| roles | ["ROLE_USER"] 등 | ["ROLE_ADMIN"] | Authority 매핑 |
| adminRole | (없음) | MASTER / CS / BACKEND | 관리자 내부 등급 (관리자 토큰에만 포함) |
| jti | UUID | UUID | Blacklist / 재사용 탐지 |
| aud | "user" | "admin" | 키 분리 검증용 |
| iat / exp | O | O | 발급/만료 |

**시간 정책**

| | accessToken | refreshToken | 서명 키 |
|---|---|---|---|
| 사용자 | 30분 (1800s) | 14일 | user secret |
| 관리자 | 15분 (900s) | 1일 | admin secret |

> clock skew leeway 30~60초 허용.

---

## 8. 인증 제외(permitAll) 목록

- `POST /api/v1/user/members/login`
- `POST /api/v1/user/members/token/refresh`
- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/refresh`
- Swagger: `/swagger-ui/**`, `/v3/api-docs/**`
- 헬스체크, 공개 리소스

> 로그아웃(`/logout`)과 `me/status`는 **인증 필요** API이므로 permitAll에 포함하지 않는다.
