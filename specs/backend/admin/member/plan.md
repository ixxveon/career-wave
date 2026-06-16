# Plan: 회원관리 API (Member Management)

**Feature Branch**: `feature/admin-member-api`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## Summary

개인 회원 조회·제재 및 기업 회원 심사 어드민 REST API.
제재 처리는 members 업데이트 + suspend_histories INSERT를 동일 트랜잭션으로 처리한다.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/member/`
- Native Query 패턴 (EntityManager 직접 사용)
- 연관 테이블: `members`, `hr_managers`, `suspend_histories`, `company_profiles`, `reports`

---

## Project Structure

```text
admin/member/
├── entity/
│   ├── Member.java
│   ├── HrManager.java
│   └── SuspendHistory.java
├── repository/
│   ├── MemberRepository.java
│   ├── MemberQueryRepository.java
│   ├── HrManagerRepository.java
│   ├── HrManagerQueryRepository.java
│   └── SuspendHistoryRepository.java
├── type/
│   ├── MemberStatus.java              -- ACTIVE / SUSPENDED / BANNED
│   ├── RoleType.java                  -- ROLE_USER / ROLE_COMPANY
│   ├── SubscriptionStatus.java        -- FREE / PREMIUM
│   ├── SanctionType.java              -- WARNING / SUSPEND / BLACKLIST
│   ├── SuspendDuration.java           -- THREE_DAYS / SEVEN_DAYS / THIRTY_DAYS / PERMANENT
│   ├── HrStatus.java                  -- PENDING / ACTIVE / REMOVED
│   └── PermissionLevel.java           -- FULL / NOTICE / VIEWER
├── service/
│   ├── AdminMemberService.java
│   └── impl/
│       └── AdminMemberServiceImpl.java
├── controller/
│   └── AdminMemberController.java
├── dto/
│   ├── MemberDTO.java
│   └── HrManagerDTO.java
├── exception/
│   └── AdminMemberErrorCode.java
└── docs/
    └── AdminMemberControllerDocs.java
```

---

## Phases

- [ ] Phase 1: 엔티티 및 Enum
  - `MemberStatus`, `RoleType`, `SubscriptionStatus`, `SanctionType`, `SuspendDuration`, `HrStatus`, `PermissionLevel` Enum 작성
  - `Member.java` — UUID PK, `increaseWarningCount()` / `suspend(LocalDate)` / `ban()` 비즈니스 메서드
  - `HrManager.java` — `@PrePersist` PENDING 초기화, `approve()` / `reject()` 비즈니스 메서드
  - `SuspendHistory.java` — `@GeneratedValue(IDENTITY)`

- [ ] Phase 2: 레포지토리
  - `MemberRepository.java` — `JpaRepository<Member, UUID>`
  - `MemberQueryRepository.java` — Native Query 목록/상세 (reports subquery로 reportCount 포함)
  - `HrManagerRepository.java` — `JpaRepository<HrManager, Long>`
  - `HrManagerQueryRepository.java` — Native Query 목록 (members + company_profiles JOIN), `getPendingCount()`
  - `SuspendHistoryRepository.java` — `JpaRepository<SuspendHistory, Long>`

- [ ] Phase 3: 서비스 레이어
  - `getMembers()` / `getMemberDetail()` — `@Transactional(readOnly = true)`
  - `sanctionMember()` — `@Transactional`, ALREADY_BANNED(409) / ALREADY_SUSPENDED(409) / INVALID_SANCTION_DURATION(400) / REASON_TOO_SHORT(400) 검증, SanctionType별 비즈니스 메서드 호출, SuspendHistory 저장
  - `getHrManagers()` / `getHrManagerDetail()` — `@Transactional(readOnly = true)`
  - `approveHrManager()` — `@Transactional`, ALREADY_PROCESSED(409)
  - `rejectHrManager()` — `@Transactional`, ALREADY_PROCESSED(409) / REASON_TOO_SHORT(400)
  - `AdminMemberErrorCode.java` 작성

- [ ] Phase 4: 컨트롤러
  - `AdminMemberController.java` — 개인 회원 3개 + 기업 회원 4개 엔드포인트 (`/api/v1/admin/...`)
  - `AdminMemberControllerDocs.java` Swagger 인터페이스 작성

- [ ] Phase 5: 검증
  - BANNED 회원 재제재 시 409 반환 확인
  - SUSPEND + PERMANENT 지정 시 400 반환 확인
  - SUSPEND 제재 후 suspend_end_date 정확히 계산 확인
  - 제재 처리 시 members + SuspendHistory 동일 트랜잭션 확인
  - 기업 회원 목록 응답에 pendingCount 포함 확인
  - 모든 응답 ApiResponse<T> 래퍼 확인