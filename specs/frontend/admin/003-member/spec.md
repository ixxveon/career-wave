# Feature Specification: 회원관리 (Member Management)

**Feature Branch**: `feature/admin-member-ui`
**버전**: v1
**Status**: UI 구현 완료 — API 연동 진행 중
**담당**: 신보라

---

## 도메인 개요

플랫폼에 가입한 개인 회원(구직자, `ROLE_USER`)과 기업 회원(HR 담당자, `ROLE_COMPANY`)의 현황을
관리자가 조회·제재·승인할 수 있는 어드민 페이지.

개인 회원과 기업 회원은 동일한 `members` 테이블에서 `role` 컬럼으로 분기하며,
UI는 탭으로 구분한다.

---

## 상태 정의

### members.member_status

| 값 | 표시 | 설명 |
|---|---|---|
| `ACTIVE` | 정상 | 정상 이용 중 |
| `SUSPENDED` | 정지 | 기간 제한 활동 정지 |
| `BANNED` | 영구정지 | 영구 이용 제한 |

### suspend_histories.sanction_type

| 값 | 표시 | duration 사용 | start_date 사용 |
|---|---|---|---|
| `WARNING` | 경고 | NULL | NULL |
| `SUSPEND` | 활동 정지 | 필수 | 필수 |
| `BLACKLIST` | 영구 정지 | NULL | NULL |

### suspend_histories.duration (SUSPEND 시 필수)

| 값 | 표시 |
|---|---|
| `THREE_DAYS` | 3일 |
| `SEVEN_DAYS` | 7일 |
| `THIRTY_DAYS` | 30일 |
| `PERMANENT` | 영구 |

### 기업 회원 승인 상태 (현재 기준)

> 현재는 한국어 문자열로 관리. API 연동 시 ERD enum `PENDING / ACTIVE / REMOVED`으로 전환.

| 현재 값 | API 연동 후 enum | 표시 | 설명 |
|---|---|---|---|
| `'승인 대기'` | `PENDING` | 승인 대기 | 재직증명서 검토 전 |
| `'승인 완료'` | `ACTIVE` | 승인 완료 | HR 담당자 활성 상태 |
| `'반려'` | `REMOVED` | 반려 | 서류 미비 또는 자격 취소 |

### 경고 임계치

| 상수 | 값 | 설명 |
|---|---|---|
| `WARN_THRESHOLD` | 3 | 경고 N회 누적 시 관리자에게 "활동정지 권고" 배지 표시 |

---

## User Stories & Acceptance Scenarios

### Story 1 — 개인 회원 현황 파악 (Priority: P1)

> 관리자는 플랫폼 개인 회원의 전체 현황을 KPI 카드로 한눈에 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 개인 회원 탭 진입 시, **When** 페이지가 렌더링되면, **Then** 아래 4개 KPI 카드가 표시된다.
   - 전체 회원 수 (누적 가입 회원)
   - 오늘 신규 가입 (어제 대비 증감)
   - 프리미엄 구독 (구독 활성 상태)
   - 정지 회원 수 (제재 처리 대상)

---

### Story 2 — 개인 회원 목록 조회 및 검색 (Priority: P1)

> 관리자는 개인 회원 목록을 검색하여 특정 회원을 빠르게 찾을 수 있다.

**Acceptance Scenarios**:

1. **Given** 개인 회원 탭 진입 시, **When** 페이지가 로드되면, **Then** 전체 회원 목록이 번호·이름·이메일·로그인ID·회원유형·플랜·가입일·상태·관리 컬럼으로 표시된다.
2. **Given** 검색창에 이름·이메일·로그인 ID 중 하나를 입력했을 때, **When** 입력값이 변경되면, **Then** 해당 키워드를 포함하는 회원만 실시간으로 필터링된다.
3. **Given** 회원 목록이 표시된 상태에서, **When** 상세보기 버튼을 클릭하면, **Then** 해당 회원의 상세 정보 모달이 열린다.

---

### Story 3 — 개인 회원 상세 조회 및 경고 현황 확인 (Priority: P1)

> 관리자는 회원 상세 모달에서 경고 누적 현황을 시각적으로 파악하고 제재 여부를 판단할 수 있다.

**Acceptance Scenarios**:

1. **Given** 회원 상세 모달이 열렸을 때, **When** 정보를 확인하면, **Then** 권한·구독 플랜·가입일·최근 접속·현재 상태·신고 횟수·경고 횟수가 표시된다.
2. **Given** 회원 상세 모달의 경고 횟수 영역에서, **When** 경고 횟수를 확인하면, **Then** `WARN_THRESHOLD(3)` 기준 dot indicator(채워진 점/빈 점)와 N/3회 텍스트로 표시된다.
3. **Given** 경고 횟수가 `WARN_THRESHOLD(3)` 이상일 때, **When** 상세 모달을 열면, **Then** "활동정지 권고" 배지가 표시된다.
4. **Given** 경고 횟수가 `WARN_THRESHOLD - 1(2)` 일 때, **When** 상세 모달을 열면, **Then** "1회 추가 시 활동정지 권고" 안내가 표시된다.
5. **Given** 경고 횟수가 임계치 미만일 때, **When** 상세 모달을 열면, **Then** 경고 권고 배지 없이 dot만 표시된다.

---

### Story 4 — 개인 회원 활동 정지 처리 (Priority: P1)

> 관리자는 규정 위반 회원에게 기간 제한 또는 영구 정지를 처리할 수 있다.

**Acceptance Scenarios**:

1. **Given** 회원 상세 모달 또는 목록에서 정지처리 버튼을 클릭했을 때, **When** 활동 정지 모달이 열리면, **Then** 정지 기간(3일/7일/30일/영구) 선택 버튼과 사유 입력 텍스트에어리어가 표시된다.
2. **Given** 정지 기간 버튼 중 하나를 선택했을 때, **When** 버튼 상태를 확인하면, **Then** 선택된 기간 버튼이 강조(진한 배경) 표시된다.
3. **Given** `PERMANENT` 기간을 선택했을 때, **When** 정지 처리 확정 버튼을 확인하면, **Then** 버튼 색상이 위험색(붉은 계열)으로 표시된다.
4. **Given** 정지 기간과 사유를 입력했을 때, **When** 정지 처리 버튼을 클릭하면, **Then** `member_status → SUSPENDED(또는 BANNED)` 처리 및 `suspend_histories` INSERT가 이루어진다.
5. **Given** 처리 관리자 정보 영역에서, **When** 모달을 열면, **Then** 현재 처리 관리자 ID가 표시된다.

---

### Story 5 — 기업 회원 현황 파악 (Priority: P1)

> 관리자는 기업 회원 가입 신청 현황을 KPI 카드와 탭 뱃지로 빠르게 파악할 수 있다.

**Acceptance Scenarios**:

1. **Given** 기업 회원 탭에 승인 대기 건이 있을 때, **When** 탭 바를 확인하면, **Then** "기업 회원" 탭 옆에 대기 건수 뱃지가 표시된다.
2. **Given** 기업 회원 탭 진입 시, **When** 페이지가 렌더링되면, **Then** 전체 기업회원·승인 대기·승인 완료·반려 KPI 카드 4종이 표시된다.

---

### Story 6 — 기업 회원 목록 조회 및 검색·필터 (Priority: P1)

> 관리자는 기업 회원 목록을 키워드 검색과 승인 상태 필터로 조회할 수 있다.

**Acceptance Scenarios**:

1. **Given** 기업 회원 탭 진입 시, **When** 목록이 표시되면, **Then** 회원ID·HR 담당자명·이메일·기업명·사업자등록번호·재직증명서·가입일·승인 상태·관리 컬럼으로 표시된다.
2. **Given** 검색창에 담당자명·기업명·이메일 중 하나를 입력했을 때, **When** 입력값이 변경되면, **Then** 해당 키워드를 포함하는 기업 회원만 표시된다.
3. **Given** 승인 상태 필터에서 특정 상태(전체/승인 대기/승인 완료/반려)를 선택했을 때, **When** 필터가 적용되면, **Then** 해당 상태의 기업 회원만 표시된다.

---

### Story 7 — 기업 회원 상세 조회 및 재직증명서 확인 (Priority: P1)

> 관리자는 기업 회원 상세 모달에서 HR 담당자 정보와 재직증명서를 확인하고 승인/반려 처리를 진행할 수 있다.

**Acceptance Scenarios**:

1. **Given** 기업 회원 목록에서 상세보기 버튼을 클릭했을 때, **When** 상세 모달이 열리면, **Then** HR 담당자명·이메일·기업명·사업자등록번호·가입일·승인 상태·재직증명서 파일명이 표시된다.
2. **Given** 반려된 기업 회원의 상세 모달에서, **When** 정보를 확인하면, **Then** 반려 사유가 별도 영역에 표시된다.
3. **Given** 승인 대기 상태 기업 회원의 상세 모달에서, **When** 모달을 확인하면, **Then** "승인 처리" / "반려 처리" 버튼이 표시된다.
4. **Given** 승인 완료 상태 기업 회원의 상세 모달에서, **When** 모달을 확인하면, **Then** 승인/반려 버튼이 표시되지 않는다.

---

### Story 8 — 기업 회원 승인 처리 (Priority: P1)

> 관리자는 재직증명서를 확인한 후 기업 회원 가입을 승인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 승인 대기 상태 기업 회원에서 "승인 처리" 버튼을 클릭했을 때, **When** 승인 확인 모달이 열리면, **Then** 담당자명·기업명 및 승인 시 즉시 이용 가능하다는 안내가 표시된다.
2. **Given** 승인 확인 모달에서 "승인 확정" 버튼을 클릭했을 때, **When** 처리가 완료되면, **Then** 해당 기업 회원의 상태가 "승인 완료"로 변경된다.

---

### Story 9 — 기업 회원 반려 처리 (Priority: P1)

> 관리자는 서류 미비 또는 유효기간 만료 시 반려 사유를 입력하고 반려 처리할 수 있다.

**Acceptance Scenarios**:

1. **Given** 승인 대기 상태 기업 회원에서 "반려 처리" 버튼을 클릭했을 때, **When** 반려 처리 모달이 열리면, **Then** 반려 사유 입력 텍스트에어리어와 "신청자에게 안내됩니다" 안내 문구가 표시된다.
2. **Given** 반려 사유를 입력 후 "반려 처리" 버튼을 클릭했을 때, **When** 처리가 완료되면, **Then** 해당 기업 회원의 상태가 "반려"로 변경되고 사유가 저장된다.

---

## Edge Cases

- 이미 `BANNED` 상태인 회원에게 정지 처리 버튼을 클릭하면?
  → 현재 모달은 열리되 경고 안내 추가 필요. API 연동 시 버튼 비활성화 처리 예정.
- 이미 `승인 완료`된 기업 회원에게 다시 승인 처리를 시도하면?
  → 승인 완료 상태에서는 승인/반려 버튼이 노출되지 않아 방지됨.
- 반려 사유 없이 반려 처리 버튼을 클릭하면?
  → API 연동 시 서버에서 400 에러 반환. 현재는 빈 값 허용됨 — API 연동 시 유효성 검증 추가 필요.
- 제재 사유가 10자 미만이면?
  → `REASON_TOO_SHORT` 400 에러. 사유 입력 텍스트에어리어에 글자 수 카운터 표시 권장.
- 경고 횟수가 `WARN_THRESHOLD`를 초과(4회 이상)하면?
  → `warningCount >= WARN_THRESHOLD` 조건으로 처리되어 "활동정지 권고" 배지 그대로 표시.
- 정지 처리 중 관리자가 브라우저를 닫으면?
  → 현재 더미 데이터 기반으로 상태 유지 없음. API 연동 시 낙관적 업데이트 롤백 처리 필요.
- 기업 회원 재직증명서 파일이 만료 또는 삭제된 경우?
  → 현재 파일명 텍스트만 표시. API 연동 시 파일 유효성 확인 연동 예정.

---

## Functional Requirements

### 개인 회원

- **FR-001**: 개인 회원 목록을 이름·이메일·로그인 ID 키워드로 실시간 검색할 수 있다.
- **FR-002**: 개인 회원 목록을 권한(ROLE_USER/ROLE_COMPANY)·구독(FREE/PREMIUM)·상태(ACTIVE/SUSPENDED/BANNED)로 필터링할 수 있다. _(UI 구현 완료, API 연동 예정)_
- **FR-003**: 개인 회원 목록을 가입일 범위로 필터링할 수 있다. _(UI 구현 완료, API 연동 예정)_
- **FR-004**: 회원 상세 모달에서 기본 정보(권한·플랜·가입일·최근 접속·상태·신고 횟수)를 확인할 수 있다.
- **FR-005**: 회원 상세 모달에서 경고 횟수를 dot indicator와 N/3회 텍스트로 시각적으로 확인할 수 있다.
- **FR-006**: 경고 횟수가 `WARN_THRESHOLD(3)` 이상이면 "활동정지 권고" 배지를 표시한다.
- **FR-007**: 경고 횟수가 `WARN_THRESHOLD - 1(2)`이면 "1회 추가 시 활동정지 권고" 안내를 표시한다.
- **FR-008**: 정지 처리 모달에서 기간(3일/7일/30일/영구)과 사유를 입력하고 활동 정지를 처리할 수 있다.
- **FR-009**: `PERMANENT` 기간 선택 시 확정 버튼 색상이 위험색(붉은 계열)으로 변경된다.
- **FR-010**: 체크박스로 회원을 다중 선택할 수 있다. _(체크박스 UI 구현 완료, 일괄 처리는 v2 예정)_
- **FR-011**: 회원 데이터 내보내기 기능을 제공한다. _(내보내기 버튼 UI 구현 완료, 기능은 v2 예정)_

### 기업 회원

- **FR-012**: 기업 회원 탭에 승인 대기 건수 뱃지를 표시한다.
- **FR-013**: 기업 회원 목록을 담당자명·기업명·이메일 키워드로 실시간 검색할 수 있다.
- **FR-014**: 기업 회원 목록을 승인 상태(전체/승인 대기/승인 완료/반려)로 필터링할 수 있다.
- **FR-015**: 기업 회원 상세 모달에서 HR 담당자 정보·재직증명서·반려 사유를 확인할 수 있다.
- **FR-016**: 승인 대기 기업 회원에 대해 승인 확인 모달을 거쳐 승인 처리할 수 있다.
- **FR-017**: 승인 대기 기업 회원에 대해 반려 사유 입력 모달을 거쳐 반려 처리할 수 있다.
- **FR-018**: 승인/반려 처리 후 목록의 해당 회원 상태 뱃지가 즉시 변경된다.

---

## Key Entities

### Member (members 테이블)

| 필드 | 타입 | 설명 |
|---|---|---|
| `member_id` | UUID PK | 회원 고유 ID |
| `login_id` | VARCHAR(100) NOT NULL UNIQUE | 로그인 계정 (아이디) |
| `email` | VARCHAR(100) UNIQUE | 이메일 주소 |
| `password` | VARCHAR(255) NOT NULL | 암호화된 비밀번호 |
| `name` | VARCHAR(50) NOT NULL | 이름 |
| `phone` | VARCHAR(20) | 휴대폰 번호 |
| `role_type` | VARCHAR(20) NOT NULL | `ROLE_USER` / `ROLE_COMPANY` |
| `member_status` | VARCHAR(20) NOT NULL | `ACTIVE` / `SUSPENDED` / `BANNED` |
| `subscription_status` | VARCHAR(10) NOT NULL | `FREE` / `PREMIUM` |
| `suspend_end_date` | DATE | 정지 종료일 (NULL = 영구정지) |
| `warning_count` | INTEGER NOT NULL DEFAULT 0 | 경고 누적 횟수 |
| `last_login_at` | TIMESTAMPTZ | 마지막 로그인 일시 |
| `created_at` | TIMESTAMPTZ NOT NULL | 가입 일시 |
| `updated_at` | TIMESTAMPTZ NOT NULL | 최종 수정 일시 |

### Subscription / Plan (연관)

| 필드 | 설명 |
|---|---|
| `plan` | `FREE` / `PREMIUM` (subscriptions → plans 조인) |

### SuspendHistory (suspend_histories 테이블)

| 필드 | 타입 | 설명 |
|---|---|---|
| `history_id` | BIGSERIAL PK | 제재 이력 고유 ID |
| `member_id` | UUID FK | 제재 대상 회원 |
| `admin_id` | BIGINT FK | 처리 관리자 |
| `sanction_type` | VARCHAR | `WARNING` / `SUSPEND` / `BLACKLIST` |
| `duration` | VARCHAR NULL | `THREE_DAYS` / `SEVEN_DAYS` / `THIRTY_DAYS` / `PERMANENT` (SUSPEND만 필수) |
| `reason` | TEXT | 제재 사유 |
| `start_date` | TIMESTAMPTZ NULL | 정지 시작일 (SUSPEND만 필수) |
| `end_date` | TIMESTAMPTZ NULL | 정지 종료일 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

### HrManager (hr_managers 테이블) + CompanyProfile (company_profiles 테이블)

**hr_managers**

| 필드 | 타입 | 설명 |
|---|---|---|
| `hr_manager_id` | BIGSERIAL PK | HR 담당자 고유 ID |
| `member_id` | UUID FK → members | 연결 회원 |
| `company_profile_id` | UUID FK → company_profiles | 소속 기업 |
| `permission_level` | VARCHAR(10) NOT NULL | `FULL` / `NOTICE` / `VIEWER` |
| `hr_status` | VARCHAR(10) NOT NULL | `PENDING` / `ACTIVE` / `REMOVED` |
| `created_at` | TIMESTAMPTZ NOT NULL | 가입 신청 일시 |
| `approved_at` | TIMESTAMPTZ | 관리자 승인 일시 |

**company_profiles (관련 필드)**

| 필드 | 타입 | 설명 |
|---|---|---|
| `company_name` | VARCHAR(100) NOT NULL | 기업명 |
| `business_number` | VARCHAR(20) NOT NULL UNIQUE | 사업자등록번호 |
| `certificate_number` | VARCHAR(50) | 사업자등록증명원 발급번호 |

---

## Success Criteria

- **SC-001**: 개인 회원 목록 키워드 검색 시 입력과 동시에 결과가 실시간으로 필터링된다.
- **SC-002**: 기업 회원 탭의 승인 대기 뱃지 숫자가 실제 대기 건수와 일치한다.
- **SC-003**: 경고 dot indicator가 `warningCount` 값과 정확히 일치하여 시각적으로 표현된다.
- **SC-004**: 활동 정지 처리 후 해당 회원의 상태 뱃지가 목록에 즉시 반영된다.
- **SC-005**: 기업 회원 승인·반려 처리 후 목록의 승인 상태 뱃지가 즉시 변경된다.
- **SC-006**: `PERMANENT` 기간 선택 시 확정 버튼 색상이 붉은 계열로 변경되어 위험성을 시각적으로 전달한다.

---

## Assumptions

- 개인 회원 필터(권한·구독·상태·가입일)는 현재 UI만 구현되어 있으며, API 연동 시 서버 쿼리 파라미터로 연결한다.
- 체크박스 다중 선택 후 일괄 처리(일괄 정지 등)는 v2 예정.
- 회원 데이터 내보내기(CSV/Excel)는 v2 예정.
- 기업 회원 재직증명서 파일 실제 다운로드/미리보기는 v2 예정 (파일 스토리지 연동 필요).
- 기업 회원 반려 후 재신청(서류 재제출 플로우) UI는 v2 예정.
- `SUSPENDED` 상태 회원의 정지 해제 UI는 v2 예정.
- `BANNED` 상태 회원의 복구 처리 UI는 v2 예정.
- 기업 회원 `hrStatus`는 현재 한국어 문자열로 관리하며, API 연동 시 ERD enum(`PENDING / ACTIVE / REMOVED`)으로 전환한다.
- 처리 관리자 ID는 현재 하드코딩되어 있으며, API 연동 시 로그인 세션 기반으로 전환한다.
- `permission_level(FULL / NOTICE / VIEWER)`은 HR 담당자 권한으로 현재 상세 모달에 표시만 하며, 실제 권한 적용은 백엔드에서 처리한다.
- `WARN_THRESHOLD(3)` 기준은 백엔드 정책과 동일한 값으로 유지해야 한다. API 연동 시 환경변수 또는 설정 API로 통일 여부 확인 필요.
