# API Schema: adminManagement

> 백엔드와 프론트엔드 간 `adminManagement` 관리자 API 계약 문서.
> 본 문서는 기능 설명 문서가 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- 프로젝트 구조: Spring Boot + PostgreSQL + React
- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 모든 page Query Parameter는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환 시 `page - 1`을 적용한다.
- `from`, `to`는 ISO 8601 UTC 문자열 규칙을 사용하지만, 본 도메인 endpoint에는 적용 대상이 없다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.
- 본 문서의 ErrorCode 표에는 `adminManagement` 도메인 코드만 작성한다.

### 권한 표기

- 문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`를 사용한다.
- Spring Security 1차 진입 권한은 `ROLE_ADMIN`을 사용한다.
- 세부 역할 정책은 JWT `principal.adminRole` 값(`MASTER`, `BACKEND`, `CS`)과 `@PreAuthorize` 조건으로 구분한다.

### Pagination 규칙

- 목록 조회 API만 `page`, `size`를 사용한다.
- 상세 조회 API는 `page`, `size`를 사용하지 않는다.
- 생성/수정/삭제 API는 `page`, `size`를 사용하지 않는다.

### 공통 성공 응답 예시

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

### 공통 페이지 응답 예시

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "content": [],
    "page": 1,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
}
```

### 공통 실패 응답 예시

```json
{
  "success": false,
  "statusCode": 404,
  "message": "관리자 계정을 찾을 수 없습니다.",
  "code": "ADMIN_NOT_FOUND",
  "data": null
}
```

---

## 2. Enum 계약

| Enum | Values | ERD CHECK 제약 |
|---|---|---|
| `AdminRoleType` | `MASTER`, `CS`, `BACKEND` | `admins.admin_role` |
| `AdminStatusType` | `ACTIVE`, `LOCKED` | `admins.status` |

---

## 3. Query Parameter -> ERD 컬럼 매핑

### GET /api/v1/admin/admins

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `keyword` | `string` | `admins.email`, `admins.name` | 관리자 이메일/이름 검색 |
| `role` | `MASTER \| CS \| BACKEND` | `admins.admin_role` | 관리자 권한 필터 |
| `status` | `ACTIVE \| LOCKED` | `admins.status` | 관리자 상태 필터 |
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

### GET /api/v1/admin/admin-acls

| Query Parameter | Type | ERD 컬럼 | Description |
|---|---|---|---|
| `page` | `number` | 없음 | 페이지 번호, 1-based |
| `size` | `number` | 없음 | 페이지 크기 |

> 입력 정보에 포함된 `GET /api/v1/admin/audit-logs` Query Parameter는 `auditLog` 도메인 범위이므로 본 문서에는 포함하지 않는다.

---

## 4. 관리자 계정 API

### 4.1 GET /api/v1/admin/admins/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/admins/summary`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AdminManagementDTO.ResponseSummary>`

```json
{
  "success": true,
  "message": "관리자 관리 KPI 요약 조회에 성공했습니다.",
  "data": {
    "totalAdminCount": 5,
    "activeAdminCount": 4,
    "lockedAdminCount": 1,
    "masterAdminCount": 1
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.2 GET /api/v1/admin/admins

- **Method**: `GET`
- **Path**: `/api/v1/admin/admins`
- **Auth**: `MASTER`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `keyword` | `string` | N | `admins.email`, `admins.name` | 관리자 이메일/이름 검색 |
| `role` | `MASTER \| CS \| BACKEND` | N | `admins.admin_role` | 관리자 권한 필터 |
| `status` | `ACTIVE \| LOCKED` | N | `admins.status` | 관리자 상태 필터 |
| `page` | `number` | N | 없음 | 페이지 번호, 1-based |
| `size` | `number` | N | 없음 | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AdminManagementDTO.ResponseList>`

```json
{
  "success": true,
  "message": "관리자 계정 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "adminId": 1,
        "email": "master@career-wave.com",
        "name": "master-admin",
        "adminRole": "MASTER",
        "status": "ACTIVE",
        "lastLoginAt": "2026-06-10T00:00:00Z",
        "lastLoginIp": "10.0.0.1",
        "createdAt": "2026-06-01T00:00:00Z",
        "updatedAt": "2026-06-10T00:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.3 POST /api/v1/admin/admins

- **Method**: `POST`
- **Path**: `/api/v1/admin/admins`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: `AdminManagementDTO.RequestCreateAdmin`

```json
{
  "email": "backend@career-wave.com",
  "password": "temporary-password",
  "name": "backend-admin",
  "adminRole": "BACKEND"
}
```

#### Response Body

- Response DTO: `ApiResponse<AdminManagementDTO.ResponseAdmin>`

```json
{
  "success": true,
  "message": "관리자 계정 생성에 성공했습니다.",
  "data": {
    "adminId": 2,
    "email": "backend@career-wave.com",
    "name": "backend-admin",
    "adminRole": "BACKEND",
    "status": "ACTIVE",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "createdAt": "2026-06-10T00:00:00Z",
    "updatedAt": "2026-06-10T00:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `ADMIN_EMAIL_ALREADY_EXISTS` | 409 | 이미 사용 중인 관리자 이메일입니다. |
| `INVALID_ADMIN_ROLE` | 400 | 유효하지 않은 관리자 권한입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.4 PATCH /api/v1/admin/admins/{adminId}/role

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/admins/{adminId}/role`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: `AdminManagementDTO.RequestUpdateRole`

```json
{
  "adminRole": "CS"
}
```

#### Response Body

- Response DTO: `ApiResponse<AdminManagementDTO.ResponseAdmin>`

```json
{
  "success": true,
  "message": "관리자 권한 변경에 성공했습니다.",
  "data": {
    "adminId": 2,
    "email": "backend@career-wave.com",
    "name": "backend-admin",
    "adminRole": "CS",
    "status": "ACTIVE",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "createdAt": "2026-06-10T00:00:00Z",
    "updatedAt": "2026-06-10T00:10:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `ADMIN_NOT_FOUND` | 404 | 관리자 계정을 찾을 수 없습니다. |
| `INVALID_ADMIN_ROLE` | 400 | 유효하지 않은 관리자 권한입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.5 PATCH /api/v1/admin/admins/{adminId}/status

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/admins/{adminId}/status`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: `AdminManagementDTO.RequestUpdateStatus`

```json
{
  "status": "LOCKED"
}
```

#### Response Body

- Response DTO: `ApiResponse<AdminManagementDTO.ResponseAdmin>`

```json
{
  "success": true,
  "message": "관리자 상태 변경에 성공했습니다.",
  "data": {
    "adminId": 2,
    "email": "backend@career-wave.com",
    "name": "backend-admin",
    "adminRole": "BACKEND",
    "status": "LOCKED",
    "lastLoginAt": null,
    "lastLoginIp": null,
    "createdAt": "2026-06-10T00:00:00Z",
    "updatedAt": "2026-06-10T00:15:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `ADMIN_NOT_FOUND` | 404 | 관리자 계정을 찾을 수 없습니다. |
| `INVALID_ADMIN_STATUS` | 400 | 유효하지 않은 관리자 상태입니다. |
| `ADMIN_ALREADY_LOCKED` | 409 | 이미 잠금 상태인 관리자 계정입니다. |
| `ADMIN_ALREADY_ACTIVE` | 409 | 이미 활성 상태인 관리자 계정입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 4.6 DELETE /api/v1/admin/admins/{adminId}

- **Method**: `DELETE`
- **Path**: `/api/v1/admin/admins/{adminId}`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<Void>`

```json
{
  "success": true,
  "message": "관리자 계정 삭제에 성공했습니다.",
  "data": null
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `ADMIN_NOT_FOUND` | 404 | 관리자 계정을 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

## 5. IP ACL API

### 5.1 GET /api/v1/admin/admin-acls

- **Method**: `GET`
- **Path**: `/api/v1/admin/admin-acls`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `page` | `number` | N | 없음 | 페이지 번호, 1-based |
| `size` | `number` | N | 없음 | 페이지 크기 |

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<AdminAclDTO.ResponseList>`

```json
{
  "success": true,
  "message": "IP ACL 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "ipAclId": 1,
        "label": "본사 대역",
        "ipRange": "10.0.0.0/24",
        "isEnabled": true,
        "description": "사내 운영망",
        "createdAt": "2026-06-01T00:00:00Z",
        "updatedAt": "2026-06-10T00:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

#### Error Response

없음

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 5.2 POST /api/v1/admin/admin-acls

- **Method**: `POST`
- **Path**: `/api/v1/admin/admin-acls`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: `AdminAclDTO.RequestCreate`

```json
{
  "label": "운영 VPN",
  "ipRange": "172.16.0.0/24",
  "description": "원격 운영 접속 허용"
}
```

#### Response Body

- Response DTO: `ApiResponse<AdminAclDTO.ResponseItem>`

```json
{
  "success": true,
  "message": "IP ACL 등록에 성공했습니다.",
  "data": {
    "ipAclId": 2,
    "label": "운영 VPN",
    "ipRange": "172.16.0.0/24",
    "isEnabled": true,
    "description": "원격 운영 접속 허용",
    "createdAt": "2026-06-10T00:00:00Z",
    "updatedAt": "2026-06-10T00:00:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `IP_ACL_DUPLICATED_RANGE` | 409 | 이미 등록된 IP 범위입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 5.3 PATCH /api/v1/admin/admin-acls/{aclId}/enabled

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/admin-acls/{aclId}/enabled`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: `AdminAclDTO.RequestToggleEnabled`

```json
{
  "isEnabled": false
}
```

#### Response Body

- Response DTO: `ApiResponse<AdminAclDTO.ResponseItem>`

```json
{
  "success": true,
  "message": "IP ACL 활성 상태 변경에 성공했습니다.",
  "data": {
    "ipAclId": 2,
    "label": "운영 VPN",
    "ipRange": "172.16.0.0/24",
    "isEnabled": false,
    "description": "원격 운영 접속 허용",
    "createdAt": "2026-06-10T00:00:00Z",
    "updatedAt": "2026-06-10T00:10:00Z"
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `IP_ACL_NOT_FOUND` | 404 | IP ACL 정보를 찾을 수 없습니다. |
| `IP_ACL_ALREADY_ENABLED` | 409 | 이미 활성 상태인 IP ACL입니다. |
| `IP_ACL_ALREADY_DISABLED` | 409 | 이미 비활성 상태인 IP ACL입니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

### 5.4 DELETE /api/v1/admin/admin-acls/{aclId}

- **Method**: `DELETE`
- **Path**: `/api/v1/admin/admin-acls/{aclId}`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

- Request DTO: 없음

#### Response Body

- Response DTO: `ApiResponse<Void>`

```json
{
  "success": true,
  "message": "IP ACL 삭제에 성공했습니다.",
  "data": null
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `IP_ACL_NOT_FOUND` | 404 | IP ACL 정보를 찾을 수 없습니다. |

> 공통 보안 실패 응답: 인증이 없으면 `401`, 권한이 없으면 `403`이 반환된다.

---

## 6. DTO 계약 표

### 6.1 `AdminManagementDTO.ResponseSummary`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `totalAdminCount` | `number` | Y | 없음 | 전체 관리자 수 |
| `activeAdminCount` | `number` | Y | 없음 | 활성 관리자 수 |
| `lockedAdminCount` | `number` | Y | 없음 | 잠금 관리자 수 |
| `masterAdminCount` | `number` | Y | 없음 | `MASTER` 관리자 수 |

### 6.2 `AdminManagementDTO.ResponseAdmin`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `adminId` | `number` | Y | `admins.admin_id` | 관리자 ID |
| `email` | `string` | Y | `admins.email` | 관리자 이메일 |
| `name` | `string` | Y | `admins.name` | 관리자 이름 |
| `adminRole` | `MASTER \| CS \| BACKEND` | Y | `admins.admin_role` | 관리자 권한 |
| `status` | `ACTIVE \| LOCKED` | Y | `admins.status` | 관리자 상태 |
| `lastLoginAt` | `string \| null` | N | `admins.last_login_at` | 마지막 로그인 시각 |
| `lastLoginIp` | `string \| null` | N | `admins.last_login_ip` | 마지막 로그인 IP |
| `createdAt` | `string` | Y | `admins.created_at` | 생성 시각 |
| `updatedAt` | `string` | Y | `admins.updated_at` | 수정 시각 |

### 6.3 `AdminManagementDTO.ResponseList`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `content` | `AdminManagementDTO.ResponseAdmin[]` | Y | 없음 | 목록 데이터 |
| `page` | `number` | Y | 없음 | 현재 페이지, 1-based |
| `size` | `number` | Y | 없음 | 페이지 크기 |
| `totalElements` | `number` | Y | 없음 | 전체 건수 |
| `totalPages` | `number` | Y | 없음 | 전체 페이지 수 |

### 6.4 `AdminManagementDTO.RequestCreateAdmin`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `email` | `string` | Y | `admins.email` | 관리자 이메일 |
| `password` | `string` | Y | 없음 | 초기 비밀번호 원문 입력값 |
| `name` | `string` | Y | `admins.name` | 관리자 이름 |
| `adminRole` | `MASTER \| CS \| BACKEND` | Y | `admins.admin_role` | 생성할 관리자 권한 |

> `password`는 요청 DTO 입력값이며 DB에는 `admins.password_hash`로 해시 저장된다.

### 6.5 `AdminManagementDTO.RequestUpdateRole`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `adminRole` | `MASTER \| CS \| BACKEND` | Y | `admins.admin_role` | 변경할 관리자 권한 |

### 6.6 `AdminManagementDTO.RequestUpdateStatus`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `status` | `ACTIVE \| LOCKED` | Y | `admins.status` | 변경할 관리자 상태 |

### 6.7 `AdminAclDTO.ResponseItem`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `ipAclId` | `number` | Y | `ip_acl.ip_acl_id` | ACL ID |
| `label` | `string` | Y | `ip_acl.label` | ACL 식별 이름 |
| `ipRange` | `string` | Y | `ip_acl.ip_range` | IP/CIDR 범위 |
| `isEnabled` | `boolean` | Y | `ip_acl.is_enabled` | 활성 여부 |
| `description` | `string \| null` | N | `ip_acl.description` | 설명 |
| `createdAt` | `string` | Y | `ip_acl.created_at` | 생성 시각 |
| `updatedAt` | `string` | Y | `ip_acl.updated_at` | 수정 시각 |

> Boundary: 위 필드는 Spring Boot가 FastAPI/프론트엔드 게이트웨이에 제공하는 raw API DTO 계약이다. 프론트엔드 API wrapper는 이 응답을 `AdminAclRule` public type으로 정규화하며, `ipAclId -> id`, `ipRange -> cidr`, `isEnabled -> enabled`, `description -> note`로 매핑한다. 화면 계층과 페이지 테스트는 raw DTO 대신 정규화된 public type을 사용한다.

### 6.8 `AdminAclDTO.ResponseList`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `content` | `AdminAclDTO.ResponseItem[]` | Y | 없음 | 목록 데이터 |
| `page` | `number` | Y | 없음 | 현재 페이지, 1-based |
| `size` | `number` | Y | 없음 | 페이지 크기 |
| `totalElements` | `number` | Y | 없음 | 전체 건수 |
| `totalPages` | `number` | Y | 없음 | 전체 페이지 수 |

### 6.9 `AdminAclDTO.RequestCreate`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `label` | `string` | Y | `ip_acl.label` | ACL 식별 이름 |
| `ipRange` | `string` | Y | `ip_acl.ip_range` | IP/CIDR 범위 |
| `description` | `string \| null` | N | `ip_acl.description` | 설명 |

### 6.10 `AdminAclDTO.RequestToggleEnabled`

| Field | Type | Required | ERD 컬럼 | Description |
|---|---|---|---|---|
| `isEnabled` | `boolean` | Y | `ip_acl.is_enabled` | 활성/비활성 여부 |

---

## 7. ErrorCode 계약 표

| ErrorCode | HTTP | Description |
|---|---|---|
| `ADMIN_NOT_FOUND` | 404 | 요청한 관리자 계정이 존재하지 않음 |
| `ADMIN_EMAIL_ALREADY_EXISTS` | 409 | 관리자 이메일이 이미 존재함 |
| `INVALID_ADMIN_ROLE` | 400 | 허용되지 않은 관리자 권한 값임 |
| `INVALID_ADMIN_STATUS` | 400 | 허용되지 않은 관리자 상태 값임 |
| `ADMIN_ALREADY_LOCKED` | 409 | 이미 잠금 상태인 관리자 계정임 |
| `ADMIN_ALREADY_ACTIVE` | 409 | 이미 활성 상태인 관리자 계정임 |
| `IP_ACL_NOT_FOUND` | 404 | 요청한 IP ACL이 존재하지 않음 |
| `IP_ACL_DUPLICATED_RANGE` | 409 | 동일한 IP 범위가 이미 등록되어 있음 |
| `IP_ACL_ALREADY_ENABLED` | 409 | 이미 활성 상태인 IP ACL임 |
| `IP_ACL_ALREADY_DISABLED` | 409 | 이미 비활성 상태인 IP ACL임 |

---

## 8. 참고 사항

- 인증/인가 실패(`401`, `403`)는 공통 보안 예외 처리 범위이며, 본 문서의 도메인 ErrorCode 표에는 포함하지 않는다.
- `GET /api/v1/admin/admins`와 `GET /api/v1/admin/admin-acls`만 목록 조회 API이므로 `page`, `size`를 사용한다.
- 입력 정보의 `audit_logs` ERD는 관리자 계정/ACL 변경에 대한 감사 추적 연관 엔티티로만 참고하며, 감사 로그 조회 API 계약은 `auditLog` 도메인 문서에서 별도로 관리한다.
