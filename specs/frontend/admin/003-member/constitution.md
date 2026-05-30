# Constitution: 회원관리 (Member Management)

**Feature Branch**: `feature/admin-member-ui`
**Scope**: 개인 회원 탭, 기업 회원 탭 공통 규칙
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

관리자는 플랫폼에 가입한 개인 회원(구직자)과 기업 회원(HR 담당자)의 현황을 한 화면에서 파악하고,
문제 회원을 신속하게 식별·제재하며, 기업 가입 신청을 재직증명서 기반으로 심사할 수 있어야 한다.

개인 회원과 기업 회원은 동일한 `members` 테이블에서 `role` 컬럼으로 분기하며,
UI에서도 탭으로 구분하되 공통 구조(검색, 테이블, 모달)를 재사용한다.

---

## 2. 상태 머신

### 개인 회원 상태 전이

```text
ACTIVE
  → SUSPENDED  (활동 정지 처리, suspend_histories INSERT)
  → BANNED     (영구 정지 처리, suspend_histories INSERT)

SUSPENDED
  → ACTIVE     (정지 기간 만료, 관리자 직접 해제)
  → BANNED     (재범 시 영구 정지)

BANNED
  → (복구 불가, 관리자 직접 DB 처리만 가능 — 현재 UI 미지원)
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| ACTIVE → SUSPENDED | 허용 | 관리자가 정지 기간·사유 입력 후 처리 |
| ACTIVE → BANNED | 허용 | 영구 정지는 PERMANENT 기간 선택으로 처리 |
| SUSPENDED → ACTIVE | v2 예정 | 현재 해제 UI 미구현 |
| BANNED → ACTIVE | v2 예정 | 현재 복구 UI 미구현 |

### 기업 회원 승인 상태 전이 (hr_managers.hr_status)

```text
PENDING
  → ACTIVE   (재직증명서 확인 후 승인 처리)
  → REMOVED  (서류 미비·자격 미달 등으로 반려 처리)

REMOVED
  → PENDING  (회원이 서류 재제출 시 — v2 예정)
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| PENDING → ACTIVE | 허용 | 재직증명서 확인 후 관리자 승인 |
| PENDING → REMOVED | 허용 | 서류 미비·유효기간 만료 등으로 반려 |
| REMOVED → PENDING | v2 예정 | 회원 재제출 플로우 미구현 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 개인/기업 탭 분리 | `members.role`로 동일 테이블 분기, UI는 탭 전환 | ERD 기준 단일 테이블이므로 별도 라우트 없이 탭으로 처리 |
| 경고 임계치 상수화 | `WARN_THRESHOLD = 3` 컴포넌트 최상단 선언 | 백엔드 정책 변경 시 한 곳만 수정 |
| 경고 표시 방식 | Dot indicator (filled/empty) + 텍스트 카운트 | 시각적으로 누적 위험도를 직관적으로 전달 |
| 제재는 권고만 | 경고 3회 누적 시 UI 배지 표시, 자동 SUSPEND 없음 | 관리자의 최종 판단권 보장, 오자동 제재 방지 |
| 기업 승인 2단계 모달 | 상세 → 승인/반려 별도 확인 모달 | 실수 방지 (재직증명서 확인 → 최종 확정 분리) |
| 재직증명서 파일 | `documents` 테이블 연동 예정, 현재는 파일명 표시만 | 파일 스토리지 연동이 없는 현재 범위 고려 |

---

## 4. 불변 규칙

- `ROLE_USER`와 `ROLE_COMPANY`는 동일한 `members` 테이블의 회원이다. 별도 엔티티가 아님.
- 경고 횟수(`warning_count`)는 `suspend_histories` 레코드 INSERT 시 함께 증가한다. UI에서 직접 수정하지 않는다.
- `WARN_THRESHOLD(3)` 기준은 관리자에게 권고 배지를 표시하는 임계치이며, 자동 제재와 무관하다.
- 기업 회원 승인 처리 시 반려 사유는 신청자에게 안내되는 메시지이므로 명확하게 작성해야 한다.
- 정지 처리 모달의 처리 관리자 ID는 현재 로그인한 관리자 ID로 표시된다 (현재 하드코딩, API 연동 시 세션 기반으로 전환).
- `BANNED` 상태 회원에 대해 추가 정지 처리를 시도해도 이미 영구 정지된 회원이므로 중복 처리를 방지해야 한다.
- 기업 회원의 `hrStatus`는 현재 한국어 문자열('승인 대기'/'승인 완료'/'반려')을 사용하며,
  API 연동 시 ERD enum(PENDING / ACTIVE / REMOVED)으로 전환한다.

---

## 5. 연동 계약

- `admin-backend`는 아래 API를 제공한다:
  - `GET /api/admin/members?role=&status=&plan=&keyword=&page=&size=` — 개인 회원 목록 (페이지네이션)
  - `GET /api/admin/members/{memberId}` — 개인 회원 상세
  - `POST /api/admin/members/{memberId}/sanctions` — 제재 처리 (sanction_type, duration, reason)
  - `GET /api/admin/hr-managers?hrStatus=&keyword=&page=&size=` — 기업 회원 목록
  - `GET /api/admin/hr-managers/{memberId}` — 기업 회원 상세
  - `PATCH /api/admin/hr-managers/{memberId}/approve` — 기업 회원 승인
  - `PATCH /api/admin/hr-managers/{memberId}/reject` — 기업 회원 반려 (hr_status → REMOVED)
- 모든 응답은 `ApiResponse<T>` 형식 (`success`, `statusCode`, `message`, `data`)을 사용한다.
- 제재 처리 성공 시 해당 회원의 `member_status`가 즉시 변경되어 목록에 반영된다.

---

## 6. 금지 패턴

- 경고 횟수(`warningCount`)를 프론트엔드에서 직접 증감하는 것을 금지한다. 서버 응답 기준으로만 갱신한다.
- 이미 `BANNED` 상태인 회원에게 추가 정지 처리 UI를 노출하는 것을 금지한다.
- 기업 회원 반려 처리 시 사유 입력 없이 반려 확정하는 것을 금지한다.
- 승인/반려 처리를 단일 클릭으로 즉시 실행하는 것을 금지한다. 반드시 확인 모달을 거쳐야 한다.
- 개인 회원과 기업 회원 데이터를 동일 상태 변수에 혼합하는 것을 금지한다.
- `ROLE_MENTOR` 등 ERD에 없는 role을 코드에서 가정하는 것을 금지한다.
