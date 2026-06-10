# API Schema: adminManagement

> 백엔드와 프론트엔드 간 `adminManagement` 도메인 API 계약 문서.
> 본 문서는 기능 설명이 아니라 요청/응답 계약만 정의한다.

---

## 1. 공통 규칙

- API 응답 규격: 모든 endpoint는 `ApiResponse<T>`를 사용한다.
- 페이지 Query Parameter `page`는 외부 API 기준 **1-based**다.
- 백엔드 내부 Pageable 변환 시 `page - 1`을 적용한다.
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다.

### 권한 표기

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`를 사용한다.  
Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑한다.

### 공통 응답 래퍼

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

### 공통 페이지 응답

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

### 공통 실패 응답

- 실패 응답도 동일하게 `ApiResponse<T>` 래퍼를 사용한다.
- 현재 공통 응답 규약 기준으로 실패 응답 바디의 필드는 `success`, `statusCode`, `message`, `data`만 사용한다.
- `message`는 항상 포함한다.
- 검증 오류처럼 상세 정보가 필요한 경우에만 `data`에 부가 정보를 담고, 그 외에는 `null`이다.
- 별도의 `code` 또는 `errorCode` 필드는 현재 공통 응답 규약에 포함하지 않는다.

```json
{
  "success": false,
  "statusCode": 403,
  "message": "접근 권한이 없습니다.",
  "data": null
}
```

---

## 2. Enum 계약

| Name | Values |
|---|---|
| `adminRole` | `MASTER`, `CS`, `BACKEND` |
| `adminStatus` | `ACTIVE`, `LOCKED` |

---

## 3. 관리자 계정 API

### 3.1 GET /api/v1/admin/admins/summary

- **Method**: `GET`
- **Path**: `/api/v1/admin/admins/summary`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<AdminManagementDTO.ResponseSummary>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "관리자 관리 KPI 요약 조회에 성공했습니다.",
  "data": {
    "totalAdminCount": 5,
    "activeAdminCount": 4,
    "lockedAdminCount": 1,
    "activeAclCount": 3
  }
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `FORBIDDEN` | 403 | 관리자 관리 요약 조회 권한이 없습니다. |

---

### 3.2 GET /api/v1/admin/admins

- **Method**: `GET`
- **Path**: `/api/v1/admin/admins`
- **Auth**: `MASTER`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

없음

#### Response Body

`ApiResponse<AdminManagementDTO.ResponsePage>`

```json
{
  "success": true,
  "statusCode": 200,
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

| ErrorCode | HTTP | Message |
|---|---|---|
| `INVALID_PAGE_REQUEST` | 400 | 유효하지 않은 페이지 요청입니다. |
| `FORBIDDEN` | 403 | 관리자 계정 목록 조회 권한이 없습니다. |

---

### 3.3 POST /api/v1/admin/admins

- **Method**: `POST`
- **Path**: `/api/v1/admin/admins`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

```json
{
  "email": "backend@career-wave.com",
  "password": "temporary-password",
  "name": "backend-admin",
  "adminRole": "BACKEND"
}
```

#### Response Body

`ApiResponse<AdminManagementDTO.ResponseAdmin>`

```json
{
  "success": true,
  "statusCode": 200,
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
| `INVALID_ADMIN_REQUEST` | 400 | 관리자 계정 생성 요청값이 유효하지 않습니다. |
| `ADMIN_EMAIL_ALREADY_EXISTS` | 409 | 이미 사용 중인 관리자 이메일입니다. |
| `FORBIDDEN` | 403 | 관리자 계정 생성 권한이 없습니다. |

---

### 3.4 PATCH /api/v1/admin/admins/{adminId}/role

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/admins/{adminId}/role`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

```json
{
  "adminRole": "CS"
}
```

#### Response Body

`ApiResponse<AdminManagementDTO.ResponseAdmin>`

```json
{
  "success": true,
  "statusCode": 200,
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
| `LAST_MASTER_ADMIN_MUTATION_NOT_ALLOWED` | 409 | 마지막 MASTER 계정은 변경할 수 없습니다. |
| `FORBIDDEN` | 403 | 관리자 권한 변경 권한이 없습니다. |

---

### 3.5 PATCH /api/v1/admin/admins/{adminId}/status

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/admins/{adminId}/status`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

```json
{
  "status": "LOCKED"
}
```

#### Response Body

`ApiResponse<AdminManagementDTO.ResponseAdmin>`

```json
{
  "success": true,
  "statusCode": 200,
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
| `LAST_MASTER_ADMIN_MUTATION_NOT_ALLOWED` | 409 | 마지막 MASTER 계정은 잠금/해제할 수 없습니다. |
| `FORBIDDEN` | 403 | 관리자 상태 변경 권한이 없습니다. |

---

### 3.6 DELETE /api/v1/admin/admins/{adminId}

- **Method**: `DELETE`
- **Path**: `/api/v1/admin/admins/{adminId}`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<Void>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "관리자 계정 삭제에 성공했습니다.",
  "data": null
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `ADMIN_NOT_FOUND` | 404 | 관리자 계정을 찾을 수 없습니다. |
| `LAST_MASTER_ADMIN_MUTATION_NOT_ALLOWED` | 409 | 마지막 MASTER 계정은 삭제할 수 없습니다. |
| `FORBIDDEN` | 403 | 관리자 계정 삭제 권한이 없습니다. |

---

## 4. IP ACL API

### 4.1 GET /api/v1/admin/admin-acls

- **Method**: `GET`
- **Path**: `/api/v1/admin/admin-acls`
- **Auth**: `MASTER`, `BACKEND`

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

없음

#### Response Body

`ApiResponse<AdminAclDTO.ResponsePage>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "IP ACL 목록 조회에 성공했습니다.",
  "data": {
    "content": [
      {
        "ipAclId": 1,
        "label": "본사 내부망",
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

| ErrorCode | HTTP | Message |
|---|---|---|
| `INVALID_PAGE_REQUEST` | 400 | 유효하지 않은 페이지 요청입니다. |
| `FORBIDDEN` | 403 | IP ACL 목록 조회 권한이 없습니다. |

---

### 4.2 POST /api/v1/admin/admin-acls

- **Method**: `POST`
- **Path**: `/api/v1/admin/admin-acls`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

```json
{
  "label": "운영 VPN",
  "ipRange": "172.16.0.0/24",
  "description": "원격 운영 접속 허용"
}
```

#### Response Body

`ApiResponse<AdminAclDTO.ResponseItem>`

```json
{
  "success": true,
  "statusCode": 200,
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
| `INVALID_IP_ACL_REQUEST` | 400 | IP ACL 등록 요청값이 유효하지 않습니다. |
| `INVALID_IP_RANGE` | 400 | 유효하지 않은 IP 범위입니다. |
| `ACL_ALREADY_EXISTS` | 409 | 동일한 IP 범위 ACL이 이미 존재합니다. |
| `FORBIDDEN` | 403 | IP ACL 등록 권한이 없습니다. |

---

### 4.3 PATCH /api/v1/admin/admin-acls/{aclId}/enabled

- **Method**: `PATCH`
- **Path**: `/api/v1/admin/admin-acls/{aclId}/enabled`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

```json
{
  "isEnabled": false
}
```

#### Response Body

`ApiResponse<AdminAclDTO.ResponseItem>`

```json
{
  "success": true,
  "statusCode": 200,
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
| `ACL_NOT_FOUND` | 404 | IP ACL 정보를 찾을 수 없습니다. |
| `INVALID_IP_ACL_ENABLED_REQUEST` | 400 | IP ACL 활성 상태 요청값이 유효하지 않습니다. |
| `FORBIDDEN` | 403 | IP ACL 변경 권한이 없습니다. |

---

### 4.4 DELETE /api/v1/admin/admin-acls/{aclId}

- **Method**: `DELETE`
- **Path**: `/api/v1/admin/admin-acls/{aclId}`
- **Auth**: `MASTER`

#### Query Parameter

없음

#### Request Body

없음

#### Response Body

`ApiResponse<Void>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "IP ACL 삭제에 성공했습니다.",
  "data": null
}
```

#### Error Response

| ErrorCode | HTTP | Message |
|---|---|---|
| `ACL_NOT_FOUND` | 404 | IP ACL 정보를 찾을 수 없습니다. |
| `FORBIDDEN` | 403 | IP ACL 삭제 권한이 없습니다. |

---

## 5. DTO 계약 표

### 5.1 AdminManagementDTO

#### `AdminManagementDTO.ResponseSummary`

| Field | Type | Required | Description |
|---|---|---|---|
| `totalAdminCount` | `number` | Y | 전체 관리자 수 |
| `activeAdminCount` | `number` | Y | 활성 관리자 수 |
| `lockedAdminCount` | `number` | Y | 잠금 관리자 수 |
| `activeAclCount` | `number` | Y | 활성 ACL 수 |

#### `AdminManagementDTO.ResponseAdmin`

| Field | Type | Required | Description |
|---|---|---|---|
| `adminId` | `number` | Y | 관리자 ID |
| `email` | `string` | Y | 관리자 이메일 |
| `name` | `string` | Y | 관리자 이름 |
| `adminRole` | `MASTER \| CS \| BACKEND` | Y | 관리자 권한 |
| `status` | `ACTIVE \| LOCKED` | Y | 관리자 상태 |
| `lastLoginAt` | `string \| null` | N | 마지막 로그인 시각 |
| `lastLoginIp` | `string \| null` | N | 마지막 로그인 IP |
| `createdAt` | `string` | Y | 생성 시각 |
| `updatedAt` | `string` | Y | 수정 시각 |

> 프론트 화면 모델은 위 응답을 그대로 노출하지 않고, `adminId -> id`, `adminRole -> role`, `lastLoginIp -> ip`로 정규화해 사용한다.  
> `scope`는 별도 응답 필드가 아니라 `adminRole` 기준으로 프론트에서 계산한다.

#### `AdminManagementDTO.RequestCreateAdmin`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string` | Y | 관리자 이메일 |
| `password` | `string` | Y | 초기 비밀번호 |
| `name` | `string` | Y | 관리자 이름 |
| `adminRole` | `MASTER \| CS \| BACKEND` | Y | 부여 권한 |

#### `AdminManagementDTO.RequestUpdateRole`

| Field | Type | Required | Description |
|---|---|---|---|
| `adminRole` | `MASTER \| CS \| BACKEND` | Y | 변경 권한 |

#### `AdminManagementDTO.RequestUpdateStatus`

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | `ACTIVE \| LOCKED` | Y | 변경 상태 |

#### `AdminManagementDTO.ResponsePage`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `AdminManagementDTO.ResponseAdmin[]` | Y | 목록 데이터 |
| `page` | `number` | Y | 현재 페이지, 1-based |
| `size` | `number` | Y | 페이지 크기 |
| `totalElements` | `number` | Y | 전체 건수 |
| `totalPages` | `number` | Y | 전체 페이지 수 |

> 공통 페이지 응답은 백엔드에서 `content`, `totalElements`를 사용한다.  
> 프론트 공통 타입에서는 이를 `items`, `totalItems`로 매핑해 사용한다.

---

### 5.2 AdminAclDTO

#### `AdminAclDTO.ResponseItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `ipAclId` | `number` | Y | ACL ID |
| `label` | `string` | Y | ACL 라벨 |
| `ipRange` | `string` | Y | IP/CIDR 범위 |
| `isEnabled` | `boolean` | Y | 활성 여부 |
| `description` | `string \| null` | N | 설명 |
| `createdAt` | `string` | Y | 생성 시각 |
| `updatedAt` | `string` | Y | 수정 시각 |

> 프론트 화면 모델은 위 응답을 `ipAclId -> id`, `ipRange -> cidr`, `isEnabled -> enabled`, `description -> note`로 정규화해 사용한다.  
> `riskLevel`은 별도 저장 필드가 아니라 `ipRange`의 CIDR prefix를 기준으로 프론트에서 계산한다.

#### `AdminAclDTO.RequestCreate`

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Y | ACL 라벨 |
| `ipRange` | `string` | Y | IP/CIDR 범위 |
| `description` | `string \| null` | N | 설명 |

#### `AdminAclDTO.RequestToggleEnabled`

| Field | Type | Required | Description |
|---|---|---|---|
| `isEnabled` | `boolean` | Y | 활성/비활성 여부 |

#### `AdminAclDTO.ResponsePage`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `AdminAclDTO.ResponseItem[]` | Y | 목록 데이터 |
| `page` | `number` | Y | 현재 페이지, 1-based |
| `size` | `number` | Y | 페이지 크기 |
| `totalElements` | `number` | Y | 전체 건수 |
| `totalPages` | `number` | Y | 전체 페이지 수 |

> 공통 페이지 응답은 백엔드에서 `content`, `totalElements`를 사용한다.  
> 프론트 공통 타입에서는 이를 `items`, `totalItems`로 매핑해 사용한다.

---

## 6. ErrorCode 계약 표

### 6.1 Global Common ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | 인증이 필요한 요청에 로그인 정보가 없음 |
| `FORBIDDEN` | 403 | 해당 리소스에 대한 관리자 권한이 없음 |
| `INVALID_PAGE_REQUEST` | 400 | `page` 또는 `size` 값이 유효하지 않음 |

### 6.2 adminManagement Domain ErrorCode

| ErrorCode | HTTP | Description |
|---|---|---|
| `INVALID_ADMIN_REQUEST` | 400 | 관리자 생성 요청값이 유효하지 않음 |
| `ADMIN_NOT_FOUND` | 404 | 요청한 관리자 계정이 존재하지 않음 |
| `ADMIN_EMAIL_ALREADY_EXISTS` | 409 | 관리자 이메일이 중복됨 |
| `INVALID_ADMIN_ROLE` | 400 | 허용되지 않은 관리자 권한 값 |
| `INVALID_ADMIN_STATUS` | 400 | 허용되지 않은 관리자 상태 값 |
| `LAST_MASTER_ADMIN_MUTATION_NOT_ALLOWED` | 409 | 마지막 MASTER 계정은 변경/잠금/삭제할 수 없음 |
| `INVALID_IP_ACL_REQUEST` | 400 | IP ACL 생성 요청값이 유효하지 않음 |
| `INVALID_IP_ACL_ENABLED_REQUEST` | 400 | IP ACL 활성/비활성 요청값이 유효하지 않음 |
| `ACL_NOT_FOUND` | 404 | 요청한 ACL이 존재하지 않음 |
| `ACL_ALREADY_EXISTS` | 409 | 동일한 `ipRange` ACL이 이미 존재함 |
| `INVALID_IP_RANGE` | 400 | 허용되지 않은 IP/CIDR 형식 |
