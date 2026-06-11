# Auth API Schema (FE ↔ BE 계약)

> 응답 필드 규칙: **camelCase** (프론트 정렬).
> 모든 인증 필요 API: `Authorization: Bearer {accessToken}`
> 공통 응답 포맷: `ApiResponse<T>` (`{ success, statusCode, message, data }`)

---

## 1. 사용자 로그인

`POST /api/v1/user/members/login` — 인증 불필요(permitAll)

**Request**
```json
{ "loginId": "string", "password": "string", "roleType": "USER" }
```

> `roleType`: 필수. `USER` / `COMPANY`
> 프론트 `LoginRequest`, `useLogin.ts`의 `toLoginRequest`, MSW `memberHandlers.ts`도 이 필드를 전송하도록 동기화한다.

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
      "roleType": "USER",
      "memberStatus": "ACTIVE",
      "subscriptionStatus": "FREE",
      "companyApprovalStatus": "NONE",
      "lastLoginAt": "2026-06-09T12:00:00Z"
    }
  }
}
```

> `refreshToken`은 응답 body가 아닌 **Set-Cookie 헤더**로 전달한다.
> `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/user/members`
>
> `companyApprovalStatus` 변환 규칙: roleType이 `USER`이면 항상 `NONE`. roleType이 `COMPANY`이면 `hr_managers.hr_status` 기준 — `PENDING`→`PENDING_REVIEW`, `ACTIVE`→`APPROVED`, `REMOVED`→`REJECTED`.

**Error**
- 401 `AUTH_INVALID_CREDENTIALS` — 아이디/비밀번호 불일치 (계정 존재 여부 비노출, 공통 메시지)
- 403 `AUTH_ACCOUNT_SUSPENDED` / `AUTH_ACCOUNT_BANNED` / `AUTH_ACCOUNT_WITHDRAWN`
- 423 `AUTH_ACCOUNT_LOCKED` — 로그인 실패 5회 누적 잠금

---

## 2. 토큰 재발급

`POST /api/v1/user/members/token/refresh` — 인증 불필요(permitAll)

**Request Body**: 없음

> refreshToken은 HttpOnly cookie에서만 자동 전달한다. body fallback은 허용하지 않는다.

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
- 403 `AUTH_ACCOUNT_SUSPENDED` / `AUTH_ACCOUNT_BANNED` / `AUTH_ACCOUNT_WITHDRAWN`
- 423 `AUTH_ACCOUNT_LOCKED`

---

## 3. 계정 상태 조회 (정지/차단 고객센터 화면용)

`GET /api/v1/user/members/me/status` — 인증 필요(Bearer)

> 이 API는 AccountStatus 검증 예외다. SUSPENDED / BANNED / LOCKED / WITHDRAWN 회원도 유효한 access token이 있으면 자신의 상태와 제재 사유를 조회할 수 있다 — plan.md(SS-2) 참고.

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "memberId": "uuid",
    "roleType": "USER",
    "memberStatus": "SUSPENDED",
    "companyApprovalStatus": "NONE",
    "restriction": {
      "restrictionType": "SUSPENDED",
      "recoverable": true,
      "availableAt": "2026-06-16T00:00:00Z",
      "messageCode": "ACCOUNT_RESTRICTED",
      "reason": "커뮤니티 운영정책 위반",
      "startedAt": "2026-06-09T00:00:00Z",
      "duration": "SEVEN_DAYS"
    }
  }
}
```

> ACTIVE 회원이면 `restriction`은 `null`.

**필드 매핑 (DB → 응답)**

| 응답 필드 | 출처 |
|---|---|
| memberId | members.member_id |
| roleType | members.role_type → `USER`, `COMPANY` |
| memberStatus | members.member_status |
| companyApprovalStatus | hr_managers.hr_status → `PENDING_REVIEW` / `APPROVED` / `REJECTED`. roleType=USER는 `NONE` |
| restriction.restrictionType | members.member_status |
| restriction.recoverable | SUSPENDED / LOCKED → `true`, BANNED / WITHDRAWN → `false` |
| restriction.availableAt | LOCKED: members.locked_until, SUSPENDED: suspend_histories.end_date (NULL = 영구정지) |
| restriction.messageCode | 고정값 `"ACCOUNT_RESTRICTED"` |
| restriction.reason | suspend_histories.reason (최근 이력 1건, BANNED/WITHDRAWN도 포함) |
| restriction.startedAt | suspend_histories.start_date (LOCKED는 null) |
| restriction.duration | suspend_histories.duration — `THREE_DAYS` / `SEVEN_DAYS` / `THIRTY_DAYS` / `PERMANENT` (SUSPEND일 때만, 그 외 null) |

---

## 4. 관리자 로그인

`POST /api/v1/admin/auth/login` — 인증 불필요(permitAll)

**Request**
```json
{ "loginId": "string", "password": "string" }
```

> `loginId`: 관리자 로그인 ID (이메일 형식 아님)

**Response 200**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "로그인되었습니다.",
  "data": {
    "accessToken": "eyJ...",
    "adminInfo": {
      "id": 1,
      "name": "string",
      "role": "MASTER"
    }
  }
}
```

> `refreshToken`은 **Set-Cookie 헤더**로 전달.
> `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/admin/auth`

**Error**
- 401 `AUTH_INVALID_CREDENTIALS`
- 423 `AUTH_ACCOUNT_LOCKED`

---

## 5. 관리자 토큰 재발급

`POST /api/v1/admin/auth/refresh` — 인증 불필요(permitAll)

요청/응답 구조는 사용자 재발급(2번)과 동일. refreshToken은 HttpOnly cookie에서만 받으며 body fallback은 허용하지 않는다. 단 만료/키는 관리자 정책 적용(아래 7번).

---

## 6. 로그아웃

`POST /api/v1/user/members/logout` — 인증 필요(Bearer)
`POST /api/v1/admin/auth/logout` — 인증 필요(Bearer)

**Request Body**: 없음 (refreshToken은 cookie에서 자동 추출)

**처리**
- cookie의 refreshToken에 해당하는 Redis 세션 key 삭제 (해당 기기 세션만 폐기)
- 현재 accessToken의 jti를 `blacklist:{jti}`에 등록, TTL = access token 잔여 수명
- Set-Cookie로 refreshToken cookie 만료 처리 (`Max-Age=0`). 삭제 시 발급 때와 동일한 Path를 사용한다.

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
| roleType | USER / COMPANY | ADMIN | 권한 (ROLE_ prefix 없이 저장 — Issue #339 fix, AuthPrincipal에서만 ROLE_ 부여) |
| roles | ["USER"] 등 | ["ADMIN"] | Authority 매핑 (AuthPrincipal에서 ROLE_ prefix 추가) |
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
