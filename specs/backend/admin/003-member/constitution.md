# Constitution: 회원관리 API (Member Management)

**Feature Branch**: `feature/admin-member-api`
**Scope**: 개인 회원 관리, 기업 회원 심사, 제재 처리
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

관리자는 플랫폼에 가입한 개인 회원과 기업 회원의 현황을 실시간으로 파악하고,
규정 위반 회원을 신속하게 제재하며, 기업 가입 신청을 재직증명서 기반으로 심사할 수 있어야 한다.

모든 제재·심사 이력은 추적 가능해야 하며, 동시 처리 시에도 데이터 일관성이 보장되어야 한다.

---

## 2. 상태 머신

### 개인 회원 (members.member_status)

```text
ACTIVE
  → SUSPENDED  (SUSPEND 제재, suspend_histories INSERT)
  → BANNED     (BLACKLIST 제재, suspend_histories INSERT)

SUSPENDED
  → ACTIVE     (정지 기간 만료 — v2 예정)
  → BANNED     (재범 시 BLACKLIST 제재)

BANNED
  → (복구 불가 — 현재 UI/API 미지원)
```

| 전이 | 허용 여부 |
|------|-----------|
| ACTIVE → SUSPENDED | 허용 |
| ACTIVE → BANNED | 허용 |
| SUSPENDED → BANNED | 허용 |
| SUSPENDED → ACTIVE | v2 예정 |
| BANNED → * | 불가 |

### 기업 회원 (hr_managers.hr_status)

```text
PENDING
  → ACTIVE   (승인 처리, approved_at 기록)
  → REMOVED  (반려 처리, reject_reason 저장)

REMOVED
  → PENDING  (재신청 플로우 — v2 예정)
```

| 전이 | 허용 여부 |
|------|-----------|
| PENDING → ACTIVE | 허용 |
| PENDING → REMOVED | 허용 |
| ACTIVE → * | 불가 (ALREADY_PROCESSED) |
| REMOVED → * | 불가 (ALREADY_PROCESSED) |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 동적 필터링 | QueryDSL 또는 JPA Specification | 다중 조건 조합 쿼리 — JPQL 동적 작성 불가 |
| 제재 처리 트랜잭션 | @Transactional 단일 트랜잭션 | members 업데이트 + suspend_histories INSERT 원자성 보장 |
| company_profiles 참조 | Native Query 또는 별도 인터페이스 JOIN | admin ↔ user 도메인 직접 참조 금지 규칙 준수 |
| 관리자 ID 추출 | Security Context | Controller에서 임의 파싱 금지 |
| 페이지 번호 | 프론트 1-based → JPA 0-based 변환 (`page - 1`) | 프론트 api-schema.md 계약 기준 |
| reportCount 집계 | subquery 또는 JOIN | reports 테이블 분리 집계 — 별도 도메인 데이터 |

---

## 4. 불변 규칙

- `BANNED` 상태 회원에게 추가 제재(BLACKLIST)를 시도하면 `ALREADY_BANNED` 예외를 반환한다.
- `PENDING`이 아닌 기업 회원에 승인/반려를 시도하면 `ALREADY_PROCESSED` 예외를 반환한다.
- 제재 사유(`reason`)는 최소 10자 이상이어야 한다. 미입력 또는 미달 시 각각 `REASON_REQUIRED`, `REASON_TOO_SHORT` 예외를 반환한다.
- 반려 사유(`rejectReason`)도 동일한 10자 이상 규칙을 적용한다.
- `SUSPEND` 제재 시 `duration`은 필수다. null이면 `INVALID_SANCTION_DURATION` 예외를 반환한다.
- `warning_count`는 Service 레이어에서만 증가시킨다. 직접 수정을 금지한다.
- `approved_at`은 승인 처리 시에만 `NOW()`로 기록한다. 이후 수정하지 않는다.

---

## 5. 연동 계약

프론트엔드 API 계약은 `specs/frontend/admin/003-member/api-schema.md`를 기준으로 한다.
본 백엔드 구현은 해당 계약의 요청/응답 형식을 준수해야 한다.

- 모든 응답은 `ApiResponse<T>` 래퍼를 사용한다.
- 예외는 `CustomException(ErrorCode.xxx)` 형식으로 던진다.
- `GlobalExceptionHandler`에서 `ApiResponse.fail()`로 변환하여 반환한다.

---

## 6. 금지 패턴

- `admin`과 `user` 도메인 간 직접 클래스 참조를 금지한다.
- Controller 내부에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다.
- `new RuntimeException(...)` 직접 생성을 금지한다.
- Entity를 API 응답으로 직접 반환하는 것을 금지한다. 반드시 DTO로 변환한다.
- `warning_count`, `member_status`, `hr_status`를 Service 외부에서 직접 변경하는 것을 금지한다.
- Enum 필드에 `@Enumerated(EnumType.ORDINAL)` 사용을 금지한다. `STRING` 필수.
