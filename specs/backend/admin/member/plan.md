# Implementation Plan: 회원관리 API (Member Management)

**Feature Branch**: `feature/admin-member-api`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## 프로젝트 구조

```text
backend/src/main/java/kr/co/carrer/admin/member/
├── entity/
│   ├── Member.java                         # members 테이블 엔티티
│   ├── HrManager.java                      # hr_managers 테이블 엔티티
│   └── SuspendHistory.java                 # suspend_histories 테이블 엔티티
├── repository/
│   ├── MemberRepository.java               # JpaRepository<Member, UUID>
│   ├── MemberQueryRepository.java          # Native Query 목록/상세 조회 (reportCount 집계 포함)
│   ├── HrManagerRepository.java            # JpaRepository<HrManager, Long>
│   └── HrManagerQueryRepository.java       # Native Query 목록 조회 + pendingCount
│   └── SuspendHistoryRepository.java       # JpaRepository<SuspendHistory, Long>
├── type/
│   ├── MemberStatus.java                   # ACTIVE, SUSPENDED, BANNED
│   ├── RoleType.java                       # ROLE_USER, ROLE_COMPANY
│   ├── SubscriptionStatus.java             # FREE, PREMIUM
│   ├── SanctionType.java                   # WARNING, SUSPEND, BLACKLIST
│   ├── SuspendDuration.java               # THREE_DAYS, SEVEN_DAYS, THIRTY_DAYS, PERMANENT
│   ├── HrStatus.java                       # PENDING, ACTIVE, REMOVED
│   └── PermissionLevel.java               # FULL, NOTICE, VIEWER
├── service/
│   ├── AdminMemberService.java             # 인터페이스
│   └── impl/
│       └── AdminMemberServiceImpl.java
├── controller/
│   └── AdminMemberController.java
├── dto/
│   ├── MemberDTO.java                      # ResponseList, ResponseDetail, RequestSanction, ResponseSanction
│   └── HrManagerDTO.java                   # ResponseList, ResponseDetail, RequestReject, ResponseApprove, ResponseReject
├── exception/
│   └── AdminMemberErrorCode.java           # MEMBER_NOT_FOUND, ALREADY_BANNED, 등
└── docs/
    └── AdminMemberControllerDocs.java
```

---

## Phase 1 — 엔티티 및 Enum

### 작업 목록

1. Enum 타입 작성
   - `MemberStatus`: ACTIVE, SUSPENDED, BANNED
   - `RoleType`: ROLE_USER, ROLE_COMPANY
   - `SubscriptionStatus`: FREE, PREMIUM
   - `SanctionType`: WARNING, SUSPEND, BLACKLIST
   - `SuspendDuration`: THREE_DAYS, SEVEN_DAYS, THIRTY_DAYS, PERMANENT
   - `HrStatus`: PENDING, ACTIVE, REMOVED
   - `PermissionLevel`: FULL, NOTICE, VIEWER

2. `Member.java` 엔티티 작성
   - `@Entity @Table(name = "members")`
   - `memberId`: UUID, `@Id`
   - `memberStatus`, `roleType`, `subscriptionStatus`: `@Enumerated(EnumType.STRING)`
   - `increaseWarningCount()`: warningCount += 1
   - `suspend(LocalDate endDate)`: memberStatus = SUSPENDED, suspend_end_date 설정
   - `ban()`: memberStatus = BANNED, suspend_end_date = null

3. `HrManager.java` 엔티티 작성
   - `hrStatus`: `@Enumerated(EnumType.STRING)`, `@PrePersist`에서 PENDING 초기화
   - `approve()`: hrStatus = ACTIVE, approvedAt = now()
   - `reject(String rejectReason)`: hrStatus = REMOVED, rejectReason 저장

4. `SuspendHistory.java` 엔티티 작성
   - `@GeneratedValue(strategy = IDENTITY)`
   - `sanctionType`, `duration`: `@Enumerated(EnumType.STRING)`

---

## Phase 2 — 레포지토리

### 작업 목록

1. `MemberRepository.java` — `JpaRepository<Member, UUID>`

2. `MemberQueryRepository.java` (Native Query 패턴)
   - `EntityManager` 주입
   - `getMemberList(role, status, plan, keyword, startDate, endDate, page, size)` → reports LEFT JOIN으로 reportCount 포함
   - `countMembers(role, status, plan, keyword, startDate, endDate)` → 페이징 total
   - `getMemberDetail(UUID memberId)` → reports subquery로 reportCount 포함

3. `HrManagerRepository.java` — `JpaRepository<HrManager, Long>`

4. `HrManagerQueryRepository.java` (Native Query 패턴)
   - `getHrManagerList(hrStatus, keyword, startDate, endDate, page, size)` → members + company_profiles JOIN
   - `countHrManagers(hrStatus, keyword, startDate, endDate)`
   - `getPendingCount()` → hr_status = PENDING 전체 건수

5. `SuspendHistoryRepository.java` — `JpaRepository<SuspendHistory, Long>`

---

## Phase 3 — 서비스 레이어

### 작업 목록

1. `AdminMemberService.java` 인터페이스 작성
   - `PageResponse<MemberDTO.ResponseList> getMembers(role, status, plan, keyword, startDate, endDate, page, size)`
   - `MemberDTO.ResponseDetail getMemberDetail(UUID memberId)`
   - `MemberDTO.ResponseSanction sanctionMember(UUID memberId, RequestSanction dto, Long adminId)`
   - `PageResponse<HrManagerDTO.ResponseList> getHrManagers(hrStatus, keyword, startDate, endDate, page, size)`
   - `HrManagerDTO.ResponseDetail getHrManagerDetail(UUID memberId)`
   - `HrManagerDTO.ResponseApprove approveHrManager(UUID memberId)`
   - `HrManagerDTO.ResponseReject rejectHrManager(UUID memberId, RequestReject dto)`

2. `AdminMemberServiceImpl.java` 구현
   - `getMembers()`: `@Transactional(readOnly = true)`, page 1-based → 0-based
   - `getMemberDetail()`: `@Transactional(readOnly = true)`, MEMBER_NOT_FOUND(404)
   - `sanctionMember()`:
     - `@Transactional`
     - MEMBER_NOT_FOUND(404)
     - BANNED 상태 → ALREADY_BANNED(409)
     - SUSPEND + duration null → INVALID_SANCTION_DURATION(400)
     - SUSPEND + PERMANENT → INVALID_SANCTION_DURATION(400)
     - reason blank → REASON_REQUIRED(400)
     - reason 10자 미만 → REASON_TOO_SHORT(400)
     - SanctionType별 member 비즈니스 메서드 호출
     - SuspendHistory 생성 + 저장
   - `approveHrManager()`:
     - `@Transactional`
     - HR_MANAGER_NOT_FOUND(404)
     - PENDING 아님 → ALREADY_PROCESSED(409)
     - hrManager.approve() 호출
   - `rejectHrManager()`:
     - `@Transactional`
     - HR_MANAGER_NOT_FOUND(404)
     - PENDING 아님 → ALREADY_PROCESSED(409)
     - rejectReason blank → REASON_REQUIRED(400)
     - rejectReason 10자 미만 → REASON_TOO_SHORT(400)
     - hrManager.reject(rejectReason) 호출

---

## Phase 4 — 컨트롤러

### 작업 목록

1. `AdminMemberController.java` 작성
   - `GET  /api/admin/members`
   - `GET  /api/admin/members/{memberId}`
   - `POST /api/admin/members/{memberId}/sanctions`
   - `GET  /api/admin/hr-managers`
   - `GET  /api/admin/hr-managers/{memberId}`
   - `PATCH /api/admin/hr-managers/{memberId}/approve`
   - `PATCH /api/admin/hr-managers/{memberId}/reject`

2. `AdminMemberControllerDocs.java` Swagger 인터페이스 작성

---

## Phase 5 — 에러코드 등록 및 검증

### ErrorCode 목록

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| MEMBER_NOT_FOUND | 404 | 회원 조회 실패 |
| HR_MANAGER_NOT_FOUND | 404 | 기업 회원 조회 실패 |
| ALREADY_BANNED | 409 | BANNED 상태 회원 재제재 시도 |
| ALREADY_PROCESSED | 409 | PENDING 아닌 hr_manager 재처리 시도 |
| INVALID_MEMBER_FILTER | 400 | 잘못된 Enum 필터 값 |
| INVALID_SANCTION_DURATION | 400 | SUSPEND에 null 또는 PERMANENT 지정 |
| REASON_REQUIRED | 400 | 제재/반려 사유 미입력 |
| REASON_TOO_SHORT | 400 | 제재/반려 사유 10자 미만 |

### 검증 체크리스트

- [ ] BANNED 회원 재제재 시 409 반환
- [ ] SUSPEND + PERMANENT 시 400 반환
- [ ] SUSPEND 제재 후 suspend_end_date 정확히 계산 확인
- [ ] 제재 처리 시 members + SuspendHistory 동일 트랜잭션 확인
- [ ] PENDING 아닌 hr_manager 재처리 시 409 반환
- [ ] 반려 rejectReason blank 시 400 반환
- [ ] 기업 회원 목록 응답에 pendingCount 포함 확인
- [ ] 모든 응답 ApiResponse<T> 래퍼 확인