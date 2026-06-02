# Tasks: 회원관리 API (Member Management)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Entity & Enum 정의

### Enum (type/)

- [ ] `MemberStatus.java` — ACTIVE / SUSPENDED / BANNED
- [ ] `RoleType.java` — ROLE_USER / ROLE_COMPANY
- [ ] `SubscriptionStatus.java` — FREE / PREMIUM
- [ ] `SanctionType.java` — WARNING / SUSPEND / BLACKLIST
- [ ] `SuspendDuration.java` — THREE_DAYS / SEVEN_DAYS / THIRTY_DAYS / PERMANENT
- [ ] `HrStatus.java` — PENDING / ACTIVE / REMOVED
- [ ] `PermissionLevel.java` — FULL / NOTICE / VIEWER

### Entity (entity/)

- [ ] `Member.java`
  - [ ] `@Id @Column(name = "member_id") UUID memberId`
  - [ ] `@Enumerated(EnumType.STRING)` 모든 Enum 필드 적용
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] `increaseWarningCount()` 메서드
  - [ ] `suspend(LocalDateTime endDate)` 메서드 — member_status → SUSPENDED
  - [ ] `ban()` 메서드 — member_status → BANNED
- [ ] `HrManager.java`
  - [ ] `@Id @Column(name = "hr_manager_id") Long hrManagerId`
  - [ ] `@Enumerated(EnumType.STRING)` 모든 Enum 필드 적용
  - [ ] `approve()` 메서드 — hr_status → ACTIVE, approved_at 기록
  - [ ] `reject(String rejectReason)` 메서드 — hr_status → REMOVED, reject_reason 저장
- [ ] `SuspendHistory.java`
  - [ ] `@Id @Column(name = "suspend_history_id") Long suspendHistoryId`
  - [ ] 생성자 또는 정적 팩토리 메서드로 생성 강제

---

## Phase 2 — Repository 구현

- [ ] `MemberRepository.java` — 동적 필터링 쿼리 (role / status / plan / keyword / startDate / endDate)
- [ ] `HrManagerRepository.java` — company_profiles JOIN, hrStatus 필터, pendingCount 집계
- [ ] `SuspendHistoryRepository.java` — member_id 기준 INSERT

---

## Phase 3 — Service 구현

### AdminMemberService

#### 개인 회원

- [ ] `getMembers(...)` — 동적 필터 + 페이지네이션 (page 1-based → 0-based 변환)
- [ ] `getMemberDetail(UUID memberId)` — MEMBER_NOT_FOUND 처리
- [ ] `sanctionMember(UUID memberId, MemberDTO.RequestSanction dto)`
  - [ ] ALREADY_BANNED 체크
  - [ ] SUSPEND 시 duration null → INVALID_SANCTION_DURATION
  - [ ] reason 검증 (REASON_REQUIRED / REASON_TOO_SHORT)
  - [ ] SanctionType별 분기 처리
  - [ ] SuspendHistory 저장
  - [ ] @Transactional 적용

#### 기업 회원

- [ ] `getHrManagers(...)` — 동적 필터 + pendingCount 포함
- [ ] `getHrManagerDetail(UUID memberId)` — HR_MANAGER_NOT_FOUND 처리
- [ ] `approveHrManager(UUID memberId)` — ALREADY_PROCESSED 체크, @Transactional
- [ ] `rejectHrManager(UUID memberId, HrManagerDTO.RequestReject dto)` — ALREADY_PROCESSED 체크, reason 검증, @Transactional

---

## Phase 4 — Controller & Swagger Docs

- [ ] `AdminMemberController.java`
  - [ ] `GET /api/admin/members`
  - [ ] `GET /api/admin/members/{memberId}`
  - [ ] `POST /api/admin/members/{memberId}/sanctions`
  - [ ] `GET /api/admin/hr-managers`
  - [ ] `GET /api/admin/hr-managers/{memberId}`
  - [ ] `PATCH /api/admin/hr-managers/{memberId}/approve`
  - [ ] `PATCH /api/admin/hr-managers/{memberId}/reject`
  - [ ] Security Context에서 관리자 ID 추출
  - [ ] `@PreAuthorize("hasRole('ADMIN')")` 또는 Security Config 적용
- [ ] `AdminMemberControllerDocs.java` — Swagger 어노테이션 분리

### ErrorCode 추가 (global/exception/ErrorCode)

- [ ] `MEMBER_NOT_FOUND`
- [ ] `HR_MANAGER_NOT_FOUND`
- [ ] `ALREADY_BANNED`
- [ ] `ALREADY_PROCESSED`
- [ ] `INVALID_MEMBER_FILTER`
- [ ] `INVALID_SANCTION_DURATION`
- [ ] `REASON_REQUIRED`
- [ ] `REASON_TOO_SHORT`

---

## Phase 5 — 문서화 & 테스트

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] 프론트엔드 `api-schema.md` 계약과 실제 응답 일치 여부 검증
- [ ] 제재 처리 트랜잭션 롤백 시나리오 확인
- [ ] 승인/반려 중복 처리(ALREADY_PROCESSED) 동작 확인
