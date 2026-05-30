# Feature Specification: 신고관리 (Report Management)

**Feature Branch**: `feature/admin-report-ui`
**버전**: v1
**Status**: UI 개발 완료 / API 연동 예정
**담당**: 신보라

---

## 도메인 개요

커뮤니티 게시글·댓글·회원에 대한 신고 내역을 관리자가 조회하고,
블라인드 처리 또는 기각 처리를 통해 플랫폼 품질을 관리하는 어드민 페이지.

신고 대상이 BOARD 또는 COMMENT인 경우 블라인드 처리 시
해당 게시글·댓글의 `is_blind` 값이 함께 변경된다.

---

## 상태 정의

### reports_details.report_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 처리 대기 | 신고 접수, 미처리 상태 |
| `BLINDED` | 블라인드 | 관리자가 콘텐츠 블라인드 처리 완료 |
| `DISMISSED` | 기각 | 관리자가 신고 내용 검토 후 기각 처리 |

### reports_details.target_type

| 값 | 표시 | 설명 |
|---|---|---|
| `BOARD` | 게시글 | 커뮤니티 게시글 신고 |
| `COMMENT` | 댓글 | 커뮤니티 댓글/대댓글 신고 |
| `MEMBER` | 회원 | 회원 자체 신고 |

### reports_details.reason

| 값 | 표시 |
|---|---|
| `SPAM` | 스팸/광고 |
| `ABUSE` | 욕설/비방 |
| `AD` | 광고성 |
| `INAPPROPRIATE` | 부적절한 내용 |
| `OTHER` | 기타 |

---

## User Stories & Acceptance Scenarios

### Story 1 — 신고 현황 파악 (Priority: P1) ✅

> 관리자는 신고 현황을 KPI 카드로 한눈에 파악할 수 있다.

**Acceptance Scenarios**:

1. **Given** 신고관리 페이지 진입 시, **When** 페이지가 렌더링되면, **Then** 아래 4개 KPI 카드가 표시된다.
   - 전체 신고 (누적 접수 건수)
   - 처리 대기 (미처리 건수)
   - 블라인드 처리 (처리 완료 건수)
   - AI 고위험 감지 (AI 심각도 `높음` 건수)

---

### Story 2 — 신고 목록 조회 및 필터 (Priority: P1) ✅

> 관리자는 신고 목록을 상태·유형 필터와 키워드 검색으로 조회할 수 있다.

**Acceptance Scenarios**:

1. **Given** 신고관리 페이지 진입 시, **When** 목록이 표시되면, **Then** 신고ID·유형·게시판·신고 대상·신고자·신고 사유·접수일·상태·관리 컬럼으로 표시된다.
2. **Given** 처리 상태 필터에서 특정 상태를 선택했을 때, **When** 필터가 적용되면, **Then** 해당 상태의 신고만 표시된다.
3. **Given** 신고 대상 유형 필터에서 특정 유형을 선택했을 때, **When** 필터가 적용되면, **Then** 해당 유형의 신고만 표시된다.
4. **Given** 키워드를 입력했을 때, **When** 검색이 적용되면, **Then** 신고ID·신고 대상명·신고자명에서 일치하는 신고만 표시된다.

> **Note**: 신고 사유 필터는 v2 예정.

---

### Story 3 — 신고 상세 조회 (Priority: P1) ✅

> 관리자는 신고 상세 모달에서 신고 내용과 대상 콘텐츠를 확인할 수 있다.

**Acceptance Scenarios**:

1. **Given** 신고 목록에서 상세보기 버튼을 클릭했을 때, **When** 상세 모달이 열리면, **Then** 신고자·피신고자·신고 유형·신고 사유·대상 콘텐츠(본문)·신고 일시·현재 상태가 표시된다.
2. **Given** 신고가 이미 처리된 경우, **When** 상세 모달을 열면, **Then** 현재 상태(블라인드/기각)가 표시되고 처리 버튼이 미노출된다.
3. **Given** `PENDING` 상태 신고의 상세 모달에서, **When** 모달을 확인하면, **Then** "블라인드" / "기각" 버튼이 표시된다.

---

### Story 4 — 블라인드 처리 (Priority: P1) ✅

> 관리자는 신고된 콘텐츠를 블라인드 처리하여 사용자에게 노출되지 않도록 할 수 있다.

**Acceptance Scenarios**:

1. **Given** `PENDING` 신고의 상세 모달에서 "블라인드" 버튼을 클릭했을 때, **When** 처리가 완료되면, **Then** 해당 신고 상태가 "블라인드"로 즉시 변경된다.
2. **Given** target_type이 `MEMBER`인 신고를 블라인드 처리할 때, **When** 처리가 완료되면, **Then** 신고 상태만 BLINDED로 변경된다. (콘텐츠 블라인드 해당 없음)

---

### Story 5 — 기각 처리 (Priority: P1) ✅

> 관리자는 신고 내용 검토 후 부당한 신고를 기각 처리할 수 있다.

**Acceptance Scenarios**:

1. **Given** `PENDING` 신고의 상세 모달에서 "기각" 버튼을 클릭했을 때, **When** 처리가 완료되면, **Then** 해당 신고 상태가 "기각"으로 즉시 변경된다.

---

### Story 6 — AI 검토 (Priority: P1) ✅

> 관리자는 AI 검토 의견을 참고하여 신고를 처리할 수 있다.

**Acceptance Scenarios**:

1. **Given** AI 검토 결과가 있는 신고의 상세 모달에서, **When** 모달을 열면, **Then** 콘텐츠 심각도·처리 권고·AI 요약이 표시된다.
2. **Given** AI 검토 결과가 없는 신고의 상세 모달에서, **When** "AI 검토 요청" 버튼을 클릭하면, **Then** AI 검토가 수행되고 결과가 표시된다.
3. **Given** 대상 회원의 AI 검토 결과가 있는 경우, **When** 모달을 열면, **Then** 누적 신고 건수·위험도·경고 횟수·제재 권고가 표시된다.

---

### Story 7 — 콘텐츠 삭제 및 회원 제재 (Priority: P1) ✅

> 관리자는 신고 상세 모달에서 직접 콘텐츠 삭제 및 대상 회원 제재를 처리할 수 있다.

**Acceptance Scenarios**:

1. **Given** `BOARD` 또는 `COMMENT` 신고의 상세 모달에서, **When** 모달을 열면, **Then** "게시글 삭제" 또는 "댓글 삭제" 버튼이 표시된다.
2. **Given** "회원 제재" 버튼을 클릭했을 때, **When** 회원 제재 모달이 열리면, **Then** 제재 유형(경고/활동정지/블랙리스트)·정지 기간·사유 입력창이 표시된다.
3. **Given** 일괄 처리 바가 표시된 상태에서, **When** "일괄 삭제"를 클릭하면, **Then** 선택된 신고 건이 목록에서 제거된다.

---

## Edge Cases

- 이미 처리된(BLINDED / DISMISSED) 신고에 재처리 시도 → 처리 버튼 미노출로 방지, API 연동 시 서버에서 409 반환
- target_type이 MEMBER인 신고 블라인드 처리 → 콘텐츠 블라인드가 아닌 신고 상태만 변경 (회원 제재는 신고 상세의 "회원 제재" 모달에서 처리)
- 신고 대상 게시글/댓글이 이미 삭제된 경우 → 상세 모달에서 "삭제된 콘텐츠" 안내 표시 예정 (API 연동 시 처리)
- 동일 콘텐츠에 다수 신고가 존재하는 경우 → 각 신고 건별 독립 처리
- AI 검토 결과가 없는 신고 → 상세 모달에서 "AI 검토 요청" 버튼으로 수동 요청 가능

---

## Functional Requirements

- **FR-001**: 신고 목록을 처리 상태(PENDING / BLINDED / DISMISSED)로 필터링할 수 있다. ✅
- **FR-002**: 신고 목록을 신고 대상 유형(BOARD / COMMENT / MEMBER)으로 필터링할 수 있다. ✅
- **FR-003**: 신고 목록을 신고 사유로 필터링할 수 있다. _(v2 예정)_
- **FR-004**: 신고 상세 모달에서 신고자·피신고자·대상 콘텐츠를 확인할 수 있다. ✅
- **FR-005**: `PENDING` 신고에 대해 블라인드 처리할 수 있다. ✅
- **FR-006**: `PENDING` 신고에 대해 기각 처리할 수 있다. ✅
- **FR-007**: 처리 완료 후 목록의 해당 신고 상태 뱃지가 즉시 변경된다. ✅
- **FR-008**: 체크박스로 신고를 다중 선택하고 일괄 블라인드·기각·삭제를 처리할 수 있다. ✅
- **FR-009**: AI 검토 의견(심각도·권고·요약)을 상세 모달에서 확인할 수 있다. ✅
- **FR-010**: 신고 상세 모달에서 BOARD/COMMENT 대상 콘텐츠를 삭제할 수 있다. ✅
- **FR-011**: 신고 상세 모달에서 대상 회원에게 직접 제재(경고/활동정지/블랙리스트)를 처리할 수 있다. ✅

---

## Key Entities

### ReportDetail (reports_details 테이블)

| 필드 | 타입 | 설명 |
|---|---|---|
| `report_id` | BIGSERIAL PK | 신고 고유 식별자 |
| `member_id` | UUID FK → members | 신고당한 회원 |
| `reporter_id` | UUID FK → members | 신고한 회원 |
| `target_type` | VARCHAR(20) NOT NULL | `BOARD` / `COMMENT` / `MEMBER` |
| `target_id` | BIGINT NOT NULL | 신고 대상 레코드 ID |
| `reason` | VARCHAR(30) NOT NULL | `SPAM` / `ABUSE` / `AD` / `INAPPROPRIATE` / `OTHER` |
| `report_status` | VARCHAR(20) NOT NULL | `PENDING` / `BLINDED` / `DISMISSED` |
| `ai_suggestion` | TEXT | AI 검토 의견 |
| `processed_by` | BIGINT FK → admins | 처리 관리자 |
| `processed_at` | TIMESTAMPTZ | 처리 완료 일시 |
| `created_at` | TIMESTAMPTZ NOT NULL | 신고 접수 일시 |

### Board (boards 테이블 — 연관)

| 필드 | 타입 | 설명 |
|---|---|---|
| `board_id` | BIGSERIAL PK | 게시글 고유 식별자 |
| `is_blind` | BOOLEAN NOT NULL DEFAULT FALSE | 블라인드 처리 여부 |

### Comment (comments 테이블 — 연관)

| 필드 | 타입 | 설명 |
|---|---|---|
| `comment_id` | BIGSERIAL PK | 댓글 고유 식별자 |
| `is_blind` | BOOLEAN NOT NULL DEFAULT FALSE | 블라인드 처리 여부 |

---

## Success Criteria

- **SC-001**: 처리 상태·유형 필터 및 키워드 검색 적용 후 해당 조건의 신고만 정확하게 표시된다.
- **SC-002**: 블라인드 처리 완료 후 목록의 상태 뱃지가 즉시 "블라인드"로 변경된다.
- **SC-003**: 기각 처리 완료 후 목록의 상태 뱃지가 즉시 "기각"으로 변경된다.
- **SC-004**: 이미 처리된 신고의 상세 모달에서 처리 버튼이 노출되지 않는다.
- **SC-005**: AI 검토 결과가 있는 신고의 상세 모달에서 심각도·권고·요약이 표시된다.

---

## Assumptions

- 블라인드·기각 처리는 상세 모달 내 버튼 단일 클릭으로 즉시 처리된다. (별도 확인 모달 없음)
- `target_type = MEMBER` 신고 블라인드 처리는 신고 상태만 변경하며, 실제 회원 제재는 신고 상세 모달의 "회원 제재" 버튼을 통해 처리한다.
- AI 검토 기능은 v1에서 구현되어 있으며, API 연동 시 서버 AI 결과로 전환한다. (현재 더미/mock 데이터)
- 일괄 처리(다중 선택 후 블라인드/기각/삭제)는 v1에서 UI 및 로컬 상태 처리가 구현되어 있으며, API 연동은 v2 예정.
- 신고 처리 상태(`reportStatus`)는 API 연동 시 서버 Enum(`PENDING` / `BLINDED` / `DISMISSED`) 값을 그대로 사용하며, 한글 표시는 프론트엔드 상수로 관리한다.
- 신고 사유 필터는 v2 예정.
