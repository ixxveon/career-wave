# Feature Specification: 회원관리 API (Member Management)

**Feature Branch**: `feature/admin-member-api`
**Status**: Draft
**담당**: 신보라

---

## 도메인 개요

관리자가 플랫폼 개인 회원(구직자)과 기업 회원(HR 담당자)의 현황을 조회하고,
규정 위반 회원에 대한 제재 처리 및 기업 가입 신청 심사를 처리하는 어드민 API.

- 개인 회원과 기업 회원은 동일한 `members` 테이블에서 `role_type`으로 분기한다.
- 제재 이력은 `suspend_histories` 테이블에 별도 기록한다.
- 기업 회원 심사 정보는 `hr_managers` 테이블에서 관리한다.
- 기업 회원 상세 조회 시 `company_profiles` 테이블을 JOIN한다.

---

## ERD

### members

```sql
member_id           UUID          PK DEFAULT gen_random_uuid()
login_id            VARCHAR(100)  NOT NULL UNIQUE
email               VARCHAR(100)  UNIQUE
password            VARCHAR(255)  NOT NULL
name                VARCHAR(50)   NOT NULL
phone               VARCHAR(20)   NULL
role_type           VARCHAR(20)   NOT NULL CHECK (role_type IN ('ROLE_USER', 'ROLE_COMPANY'))
member_status       VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                    CHECK (member_status IN ('ACTIVE', 'SUSPENDED', 'BANNED'))
subscription_status VARCHAR(10)   NOT NULL DEFAULT 'FREE'
                    CHECK (subscription_status IN ('FREE', 'PREMIUM'))
suspend_end_date    DATE          NULL
warning_count       INTEGER       NOT NULL DEFAULT 0
last_login_at       TIMESTAMPTZ   NULL
created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
```

### hr_managers

```sql
hr_manager_id       BIGSERIAL     PK
member_id           UUID          NOT NULL REFERENCES members(member_id)
company_profile_id  UUID          NOT NULL REFERENCES company_profiles(company_profile_id)
permission_level    VARCHAR(10)   NOT NULL DEFAULT 'FULL'
                    CHECK (permission_level IN ('FULL', 'NOTICE', 'VIEWER'))
hr_status           VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                    CHECK (hr_status IN ('PENDING', 'ACTIVE', 'REMOVED'))
reject_reason       TEXT          NULL
created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
approved_at         TIMESTAMPTZ   NULL
```

### suspend_histories

```sql
history_id      BIGSERIAL     PK
member_id       UUID          NOT NULL REFERENCES members(member_id)
admin_id        BIGINT        NOT NULL REFERENCES admins(admin_id)
sanction_type   VARCHAR(20)   NOT NULL CHECK (sanction_type IN ('WARNING', 'SUSPEND', 'BLACKLIST'))
duration        VARCHAR(20)   NULL     CHECK (duration IN ('THREE_DAYS', 'SEVEN_DAYS', 'THIRTY_DAYS', 'PERMANENT'))
reason          TEXT          NOT NULL
start_date      TIMESTAMPTZ   NULL
end_date        TIMESTAMPTZ   NULL
created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
```

---

## 패키지 구조

```text
admin/member/
├── entity/
│   ├── Member.java
│   ├── HrManager.java
│   └── SuspendHistory.java
├── repository/
│   ├── MemberRepository.java
│   ├── HrManagerRepository.java
│   └── SuspendHistoryRepository.java
├── type/
│   ├── MemberStatus.java        -- ACTIVE / SUSPENDED / BANNED
│   ├── RoleType.java            -- ROLE_USER / ROLE_COMPANY
│   ├── SubscriptionStatus.java  -- FREE / PREMIUM
│   ├── SanctionType.java        -- WARNING / SUSPEND / BLACKLIST
│   ├── SuspendDuration.java     -- THREE_DAYS / SEVEN_DAYS / THIRTY_DAYS / PERMANENT
│   ├── HrStatus.java            -- PENDING / ACTIVE / REMOVED
│   └── PermissionLevel.java     -- FULL / NOTICE / VIEWER
├── service/
│   └── AdminMemberService.java
├── controller/
│   └── AdminMemberController.java
├── dto/
│   ├── MemberDTO.java
│   └── HrManagerDTO.java
└── docs/
    └── AdminMemberControllerDocs.java
```

---

## DTO 구조

### MemberDTO

```java
public class MemberDTO {

    // 개인 회원 목록 응답
    public static class ResponseList {
        UUID memberId;
        String loginId;
        String name;
        String email;
        RoleType role;
        SubscriptionStatus plan;
        MemberStatus memberStatus;
        int warningCount;
        int reportCount;        // reports 테이블 집계
        LocalDateTime joinedAt;
        LocalDateTime lastLoginAt;
    }

    // 개인 회원 상세 응답 (목록 응답과 동일 필드 구성)
    public static class ResponseDetail {
        UUID memberId;
        String loginId;
        String name;
        String email;
        RoleType role;
        SubscriptionStatus plan;
        MemberStatus memberStatus;
        int warningCount;
        int reportCount;
        LocalDateTime joinedAt;
        LocalDateTime lastLoginAt;
    }

    // 제재 처리 요청
    public static class RequestSanction {
        SanctionType sanctionType;   // WARNING / SUSPEND / BLACKLIST
        SuspendDuration duration;    // SUSPEND 시 필수
        String reason;               // 최소 10자, 최대 500자
    }

    // 제재 처리 응답
    public static class ResponseSanction {
        UUID memberId;
        MemberStatus memberStatus;
        SanctionType sanctionType;
        SuspendDuration duration;
        LocalDateTime startDate;
        LocalDateTime endDate;
    }
}
```

### HrManagerDTO

```java
public class HrManagerDTO {

    // 기업 회원 목록 응답
    public static class ResponseList {
        UUID memberId;
        String hrName;
        String email;
        String companyName;
        String certificateNumber;
        PermissionLevel permissionLevel;
        String certFileUrl;
        String certFileName;
        LocalDateTime joinedAt;
        LocalDateTime approvedAt;
        HrStatus hrStatus;
    }

    // 기업 회원 상세 응답
    public static class ResponseDetail {
        UUID memberId;
        String hrName;
        String email;
        String companyName;
        String certificateNumber;
        PermissionLevel permissionLevel;
        String certFileUrl;
        String certFileName;
        LocalDateTime joinedAt;
        LocalDateTime approvedAt;
        HrStatus hrStatus;
        String rejectReason;    // REMOVED 시 저장, 나머지 null
    }

    // 기업 회원 반려 요청
    public static class RequestReject {
        String rejectReason;    // 최소 10자, 최대 500자
    }

    // 승인 응답
    public static class ResponseApprove {
        UUID memberId;
        HrStatus hrStatus;
        LocalDateTime approvedAt;
    }

    // 반려 응답
    public static class ResponseReject {
        UUID memberId;
        HrStatus hrStatus;
        String rejectReason;
    }
}
```

---

## API 명세

모든 응답은 `ApiResponse<T>` 형식을 사용한다.

### 개인 회원

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/members` | 개인 회원 목록 조회 |
| GET | `/api/admin/members/{memberId}` | 개인 회원 상세 조회 |
| POST | `/api/admin/members/{memberId}/sanctions` | 회원 제재 처리 |

#### GET /api/admin/members

**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `role` | String | N | `ROLE_USER` / `ROLE_COMPANY` |
| `status` | String | N | `ACTIVE` / `SUSPENDED` / `BANNED` |
| `plan` | String | N | `FREE` / `PREMIUM` |
| `keyword` | String | N | 이름·이메일·로그인ID 통합 검색 (최대 100자) |
| `startDate` | String | N | 가입일 범위 시작 (`yyyy-MM-dd`) |
| `endDate` | String | N | 가입일 범위 종료 (`yyyy-MM-dd`) |
| `page` | int | N | 페이지 번호 (default: 1, 프론트 1-based → JPA 0-based 변환) |
| `size` | int | N | 페이지당 건수 (default: 20, 최대 100) |

**Response**: `ApiResponse<Page<MemberDTO.ResponseList>>`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "items": [...],
    "page": 1,
    "size": 20,
    "totalItems": 12482,
    "totalPages": 625
  }
}
```

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |
| `INVALID_MEMBER_FILTER` | 400 | 지원하지 않는 필터 값입니다. |

---

#### GET /api/admin/members/{memberId}

**Path Parameters**: `memberId` (UUID)

**Response**: `ApiResponse<MemberDTO.ResponseDetail>`

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원입니다. |

---

#### POST /api/admin/members/{memberId}/sanctions

**Request Body**: `MemberDTO.RequestSanction`

**Response**: `ApiResponse<MemberDTO.ResponseSanction>`

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원입니다. |
| `ALREADY_BANNED` | 409 | 이미 영구 정지된 회원입니다. |
| `INVALID_SANCTION_DURATION` | 400 | SUSPEND 제재 시 기간이 필요합니다. |
| `REASON_REQUIRED` | 400 | 제재 사유는 필수입니다. |
| `REASON_TOO_SHORT` | 400 | 제재 사유는 최소 10자 이상 입력해주세요. |

---

### 기업 회원

| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/hr-managers` | 기업 회원 목록 조회 |
| GET | `/api/admin/hr-managers/{memberId}` | 기업 회원 상세 조회 |
| PATCH | `/api/admin/hr-managers/{memberId}/approve` | 기업 회원 승인 |
| PATCH | `/api/admin/hr-managers/{memberId}/reject` | 기업 회원 반려 |

#### GET /api/admin/hr-managers

**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `hrStatus` | String | N | `PENDING` / `ACTIVE` / `REMOVED` |
| `keyword` | String | N | HR 담당자명·기업명·이메일 통합 검색 (최대 100자) |
| `startDate` | String | N | 가입일 범위 시작 (`yyyy-MM-dd`) |
| `endDate` | String | N | 가입일 범위 종료 (`yyyy-MM-dd`) |
| `page` | int | N | 페이지 번호 (default: 1) |
| `size` | int | N | 페이지당 건수 (default: 20, 최대 100) |

**Response**: `ApiResponse<Page<HrManagerDTO.ResponseList>>` + `pendingCount`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "items": [...],
    "page": 1,
    "size": 20,
    "totalItems": 4,
    "totalPages": 1,
    "pendingCount": 2
  }
}
```

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 관리자 인증이 필요합니다. |

---

#### GET /api/admin/hr-managers/{memberId}

**Response**: `ApiResponse<HrManagerDTO.ResponseDetail>`

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `HR_MANAGER_NOT_FOUND` | 404 | 존재하지 않는 기업 회원입니다. |

---

#### PATCH /api/admin/hr-managers/{memberId}/approve

**Response**: `ApiResponse<HrManagerDTO.ResponseApprove>`

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `HR_MANAGER_NOT_FOUND` | 404 | 존재하지 않는 기업 회원입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 가입 신청입니다. |

---

#### PATCH /api/admin/hr-managers/{memberId}/reject

**Request Body**: `HrManagerDTO.RequestReject`

**Response**: `ApiResponse<HrManagerDTO.ResponseReject>`

**Errors**:

| ErrorCode | 상태 | 메시지 |
|---|---|---|
| `HR_MANAGER_NOT_FOUND` | 404 | 존재하지 않는 기업 회원입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 가입 신청입니다. |
| `REASON_REQUIRED` | 400 | 반려 사유는 필수입니다. |
| `REASON_TOO_SHORT` | 400 | 반려 사유는 최소 10자 이상 입력해주세요. |

---

## 핵심 Service 로직

### 제재 처리 (`@Transactional`)

```text
sanctionMember(memberId, RequestSanction dto)
  1. Member 조회 → MEMBER_NOT_FOUND
  2. member_status == BANNED → ALREADY_BANNED
  3. SUSPEND 요청 시 duration == null → INVALID_SANCTION_DURATION
  4. reason 검증 → REASON_REQUIRED / REASON_TOO_SHORT (10자 미만)
  5. SanctionType별 처리:
     - WARNING  : member.increaseWarningCount()
     - SUSPEND  : member.suspend(endDate 계산), suspend_end_date 저장
     - BLACKLIST: member.ban(), suspend_end_date = null
  6. SuspendHistory 생성 및 저장
  7. Member 변경사항 반영 (JPA 더티 체킹)
```

**SUSPEND duration별 suspend_end_date 계산**:

| duration | suspend_end_date |
|---|---|
| `THREE_DAYS` | NOW() + 3일 |
| `SEVEN_DAYS` | NOW() + 7일 |
| `THIRTY_DAYS` | NOW() + 30일 |
| `PERMANENT` | null (사실상 BLACKLIST와 동일) |

### 기업 회원 승인/반려 (`@Transactional`)

```text
approveHrManager(memberId)
  1. HrManager 조회 → HR_MANAGER_NOT_FOUND
  2. hr_status != PENDING → ALREADY_PROCESSED
  3. hrManager.approve() → hr_status = ACTIVE, approved_at = NOW()

rejectHrManager(memberId, RequestReject dto)
  1. HrManager 조회 → HR_MANAGER_NOT_FOUND
  2. hr_status != PENDING → ALREADY_PROCESSED
  3. rejectReason 검증 → REASON_REQUIRED / REASON_TOO_SHORT
  4. hrManager.reject(rejectReason) → hr_status = REMOVED, reject_reason 저장
```

---

## ErrorCode 목록

| ErrorCode | HTTP | 메시지 |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원입니다. |
| `HR_MANAGER_NOT_FOUND` | 404 | 존재하지 않는 기업 회원입니다. |
| `ALREADY_BANNED` | 409 | 이미 영구 정지된 회원입니다. |
| `ALREADY_PROCESSED` | 409 | 이미 처리된 가입 신청입니다. |
| `INVALID_MEMBER_FILTER` | 400 | 지원하지 않는 필터 값입니다. |
| `INVALID_SANCTION_DURATION` | 400 | SUSPEND 제재 시 기간이 필요합니다. |
| `REASON_REQUIRED` | 400 | 사유는 필수입니다. |
| `REASON_TOO_SHORT` | 400 | 사유는 최소 10자 이상 입력해주세요. |

---

## Functional Requirements

- **FR-001**: 개인 회원 목록은 `role`, `status`, `plan`, `keyword`, `startDate`, `endDate` 동적 필터링을 지원한다.
- **FR-002**: keyword 검색은 `name`, `email`, `login_id` 대상 LIKE 쿼리로 처리한다.
- **FR-003**: 기업 회원 목록 응답에 `pendingCount` (`hr_status = PENDING` 전체 건수)를 포함한다.
- **FR-004**: 기업 회원 상세 조회 시 `company_profiles` JOIN으로 기업명·사업자등록번호 등을 함께 반환한다.
- **FR-005**: 제재 처리는 `members` 업데이트 + `suspend_histories` INSERT를 하나의 트랜잭션으로 처리한다.
- **FR-006**: 모든 관리자 API는 JWT 인증 + `ROLE_ADMIN` 권한 검증을 거친다.
- **FR-007**: 인증 관리자 ID는 Security Context에서 추출한다. Controller에서 임의 파싱을 금지한다.
- **FR-008**: 페이지 번호는 프론트 1-based 기준이며, JPA Pageable 변환 시 `page - 1`을 적용한다.

---

## Assumptions

- `company_profiles` 테이블은 `user` 도메인에서 관리하며, 이 도메인에서는 JOIN 조회만 수행한다. (`admin`↔`user` 직접 참조 금지 — Repository 레벨에서 Native Query 또는 별도 인터페이스로 처리)
- `admins` 테이블의 PK는 BIGINT. `suspend_histories.admin_id`는 로그인한 관리자 ID를 사용한다.
- `reportCount`는 별도 `reports` 테이블의 집계값이다. 상세 조회 시 subquery 또는 JOIN으로 제공한다.
- 동적 필터링 쿼리는 QueryDSL 또는 JPA Specification으로 구현한다.
- 기업 회원 재직증명서 파일 정보(`certFileUrl`, `certFileName`)는 `documents` 테이블 연동 예정이며, v1에서는 저장된 URL 조회만 처리한다.
