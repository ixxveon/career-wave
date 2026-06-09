# API Schema: 관리자 관리

**Feature Branch**: `feature/admin-management-spec`
**Status**: Draft
**공통 응답 래퍼**: `ApiResponse<T>`
**Base Path**: `/api/v1/admin`

## Security

- 모든 endpoint는 JWT 인증과 endpoint별 `MASTER`, `BACKEND`, `CS` 세부 권한을 필요로 한다.
- 계정 생성, 권한 변경, 잠금/해제, 삭제, ACL 변경 endpoint는 관리자 세부 역할 `MASTER`만 수행할 수 있다.
- 서버는 인증 관리자 ID를 Security Context 또는 공통 인증 유틸에서 추출한다.
- 프론트엔드는 `AdminAccount.role`/`scope` 등 응답으로 내려온 권한 필드와 `401`/`403` API 실패 응답을 기준으로 버튼 노출/비활성화 상태를 결정한다.

## Permissions

문서상 권한 표기는 `MASTER`, `BACKEND`, `CS`, `USER`를 사용한다. Spring Security에서는 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`, `ROLE_USER`로 매핑한다.

| Method | Path | Allowed Roles |
|---|---|---|
| GET | `/api/v1/admin/admins/summary` | `MASTER` |
| GET | `/api/v1/admin/admins` | `MASTER` |
| POST | `/api/v1/admin/admins` | `MASTER` |
| PATCH | `/api/v1/admin/admins/{adminId}/role` | `MASTER` |
| PATCH | `/api/v1/admin/admins/{adminId}/status` | `MASTER` |
| DELETE | `/api/v1/admin/admins/{adminId}` | `MASTER` |
| GET | `/api/v1/admin/admin-acls` | `MASTER`, `BACKEND` |
| POST | `/api/v1/admin/admin-acls` | `MASTER` |
| PATCH | `/api/v1/admin/admin-acls/{aclId}/enabled` | `MASTER` |
| DELETE | `/api/v1/admin/admin-acls/{aclId}` | `MASTER` |

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/admins/summary` | 관리자 관리 KPI 요약 조회 |
| GET | `/api/v1/admin/admins` | 관리자 계정 목록 조회 |
| POST | `/api/v1/admin/admins` | 관리자 계정 생성 |
| PATCH | `/api/v1/admin/admins/{adminId}/role` | 관리자 권한 변경 |
| PATCH | `/api/v1/admin/admins/{adminId}/status` | 관리자 잠금/해제 |
| DELETE | `/api/v1/admin/admins/{adminId}` | 관리자 계정 삭제 |
| GET | `/api/v1/admin/admin-acls` | IP ACL 목록 조회 |
| POST | `/api/v1/admin/admin-acls` | IP ACL 등록 |
| PATCH | `/api/v1/admin/admin-acls/{aclId}/enabled` | IP ACL 활성/비활성 전환 |
| DELETE | `/api/v1/admin/admin-acls/{aclId}` | IP ACL 삭제 |
| GET | `/api/v1/admin/admin-audit-logs` | 관리자 보안 감사 로그 조회 |

## Query Parameters

### `GET /api/v1/admin/admins`

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | `string` | N | 관리자 ID, 이름, 이메일 검색어 |
| `role` | `AdminRole \| ALL` | N | 권한 필터. 기본값 `ALL` |
| `status` | `AdminStatus \| ALL` | N | 상태 필터. 기본값 `ALL` |
| `page` | `number` | N | 1부터 시작 |
| `size` | `number` | N | 기본값 20 |

### `GET /api/v1/admin/admin-acls`

| Name | Type | Required | Description |
|---|---|---|---|
| `page` | `number` | N | 1부터 시작 |
| `size` | `number` | N | 기본값 20 |

### `GET /api/v1/admin/admin-audit-logs`

| Name | Type | Required | Description |
|---|---|---|---|
| `actor` | `string \| ALL` | N | 행위자 필터. 기본값 `ALL` |
| `severity` | `AuditSeverity \| ALL` | N | 심각도 필터. 기본값 `ALL` |
| `page` | `number` | N | 1부터 시작 |
| `size` | `number` | N | 기본값 20 |

## Response Examples

### `ApiResponse<AdminManagementSummary>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "관리자 관리 요약 조회에 성공했습니다.",
  "data": {
    "totalAdminCount": 5,
    "activeAdminCount": 4,
    "activeAclCount": 3,
    "lockedAdminCount": 1
  }
}
```

### `ApiResponse<PagedAdminAccounts>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "관리자 목록 조회에 성공했습니다.",
  "data": {
    "items": [
      {
        "id": "ADM-0001",
        "name": "super_admin",
        "email": "super_admin@career-wave.com",
        "role": "MASTER",
        "scope": "전체 권한 통제 및 보안 승인",
        "ip": "10.20.0.10",
        "createdAt": "2026-05-01T09:30:00+09:00",
        "lastLoginAt": "2026-05-25T09:12:00+09:00",
        "status": "ACTIVE"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### `RequestCreateAdmin`

```json
{
  "email": "cs_admin@career-wave.com",
  "password": "temporary-password",
  "name": "cs_admin",
  "role": "CS"
}
```

### `RequestUpdateAdminRole`

```json
{
  "role": "BACKEND"
}
```

### `RequestUpdateAdminStatus`

```json
{
  "status": "LOCKED"
}
```

### `ApiResponse<PagedAdminAclRules>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "IP ACL 목록 조회에 성공했습니다.",
  "data": {
    "items": [
      {
        "id": "ACL-001",
        "label": "본사 사내망",
        "cidr": "10.20.0.0/16",
        "note": "사내 네트워크 전체 허용",
        "enabled": true,
        "riskLevel": "HIGH",
        "updatedAt": "2026-05-25T08:30:00+09:00"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### `RequestCreateAclRule`

```json
{
  "label": "운영 VPN",
  "cidr": "172.16.5.0/24",
  "note": "원격 운영자 접속 허용"
}
```

### `ApiResponse<PagedAdminAuditLogs>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "관리자 감사 로그 조회에 성공했습니다.",
  "data": {
    "items": [
      {
        "id": "LOG-001",
        "occurredAt": "2026-05-25T14:29:12+09:00",
        "actor": "super_admin",
        "ip": "10.20.0.10",
        "action": "권한 변경 승인",
        "target": "member:U-1007 / role:CS",
        "severity": "WARN"
      }
    ],
    "page": 1,
    "size": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

## Types

### `AdminRole`

| Value | Description |
|---|---|
| `MASTER` | 전체 권한 통제 및 보안 승인 |
| `CS` | 회원 문의, 신고, 1차 조치 |
| `BACKEND` | API, DB, 배포, 장애 대응 |

### `AdminStatus`

| Value | Description |
|---|---|
| `ACTIVE` | 접근 가능 |
| `LOCKED` | 접근 제한 |

### `AclRiskLevel`

| Value | Description |
|---|---|
| `LOW` | `/32` 단일 고정 IP |
| `MEDIUM` | `/24` 제한 대역 |
| `HIGH` | `/24`보다 넓은 대역 |

### `AuditSeverity`

| Value | Description |
|---|---|
| `INFO` | 일반 이벤트 |
| `WARN` | 주의 이벤트 |
| `ERROR` | 고위험 이벤트 |

## Response Rules

- 관리자 목록 응답은 비밀번호 또는 비밀번호 해시를 절대 포함하지 않는다.
- `MASTER` 계정이 1개뿐인 경우 해당 계정은 잠금 또는 삭제할 수 없다.
- 권한 변경, 상태 변경, 삭제, ACL 변경은 감사 로그를 생성해야 한다.
- ACL `cidr`는 CIDR 형식 검증을 통과해야 한다.
- 빈 목록은 `null` 대신 빈 배열과 pagination 필드를 반환한다.

## Error Cases

| statusCode | message | UI Handling |
|---|---|---|
| 400 | 요청 값이 올바르지 않습니다. | 필드별 검증 메시지 표시 |
| 401 | 인증이 필요합니다. | 관리자 로그인 페이지로 이동 |
| 403 | 관리자 관리 권한이 없습니다. | 권한 없음 안내 표시 |
| 404 | 대상을 찾을 수 없습니다. | 목록 재조회 및 안내 표시 |
| 409 | 마지막 마스터 관리자는 변경할 수 없습니다. | 위험 작업 차단 메시지 표시 |
| 500 | 관리자 관리 처리에 실패했습니다. | 재시도 버튼과 오류 메시지 표시 |
