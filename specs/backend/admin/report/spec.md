# Spec: 신고관리 API (Report Management)

**Feature Branch**: `feature/admin-report-api`
**버전**: v1
**Status**: 스펙 완료
**담당**: 신보라

---

## 도메인 개요

커뮤니티 게시글·댓글·회원에 대한 신고 내역을 관리자가 조회하고,
블라인드 처리 또는 기각 처리를 수행하는 어드민 API.

- target_type = BOARD 블라인드 처리: reports.report_status → BLINDED + boards.is_blind → TRUE (동일 트랜잭션)
- target_type = COMMENT 블라인드 처리: reports.report_status → BLINDED + comments.is_blind → TRUE (동일 트랜잭션)
- target_type = MEMBER 블라인드 처리: reports.report_status → BLINDED만 변경 (콘텐츠 블라인드 없음)

---

## User Stories

### Story 1 — 신고 현황 요약 조회 (P1)

**As** 관리자
**I want** 전체 신고 건수와 처리 대기 건수를 한눈에 보고 싶다
**So that** 처리가 필요한 신고 현황을 빠르게 파악할 수 있다

**Scenario 1**: 정상 조회
- Given 신고 데이터가 존재할 때
- When GET /api/v1/admin/reports/summary 요청 시
- Then 전체, 대기, 블라인드, 기각 건수를 반환한다

**Scenario 2**: 데이터 없음
- Given 신고 데이터가 하나도 없을 때
- When GET /api/v1/admin/reports/summary 요청 시
- Then 모든 카운트를 0으로 반환한다

---

### Story 2 — 신고 목록 조회 (P1)

**As** 관리자
**I want** 신고 목록을 상태, 유형, 사유별로 필터링하여 조회하고 싶다
**So that** 처리가 필요한 신고를 빠르게 찾을 수 있다

**Scenario 1**: 정상 조회 (필터 없음)
- Given 신고 데이터가 존재할 때
- When GET /api/v1/admin/reports 요청 시
- Then 전체 신고 목록을 created_at DESC 순으로 반환한다

**Scenario 2**: 상태 필터 적용
- Given status=PENDING으로 요청 시
- When GET /api/v1/admin/reports?status=PENDING 요청 시
- Then PENDING 상태 신고만 반환한다

**Scenario 3**: 잘못된 필터 값
- Given status=INVALID로 요청 시
- When GET /api/v1/admin/reports?status=INVALID 요청 시
- Then 400 INVALID_REPORT_FILTER를 반환한다

---

### Story 3 — 신고 상세 조회 (P1)

**As** 관리자
**I want** 신고된 콘텐츠 상세 내용을 확인하고 싶다
**So that** 블라인드 또는 기각 처리 여부를 판단할 수 있다

**Scenario 1**: 정상 조회
- Given 유효한 reportId로 요청 시
- When GET /api/v1/admin/reports/{reportId} 요청 시
- Then 신고 상세 정보와 대상 콘텐츠 내용을 반환한다

**Scenario 2**: 대상 콘텐츠 삭제됨
- Given 신고 대상 게시글이 이미 삭제된 경우
- When GET /api/v1/admin/reports/{reportId} 요청 시
- Then contentTitle, contentBody를 null로 반환한다

**Scenario 3**: 신고 없음
- Given 존재하지 않는 reportId로 요청 시
- When GET /api/v1/admin/reports/{reportId} 요청 시
- Then 404 REPORT_NOT_FOUND를 반환한다

---

### Story 4 — 블라인드 처리 (P1)

**As** 관리자
**I want** 신고된 게시글 또는 댓글을 블라인드 처리하고 싶다
**So that** 유해 콘텐츠를 즉시 숨길 수 있다

**Scenario 1**: BOARD 블라인드 처리
- Given target_type = BOARD인 PENDING 신고에 대해
- When PATCH /api/v1/admin/reports/{reportId}/blind 요청 시
- Then report_status = BLINDED, boards.is_blind = TRUE가 동일 트랜잭션에서 변경되고 처리 결과를 반환한다

**Scenario 2**: COMMENT 블라인드 처리
- Given target_type = COMMENT인 PENDING 신고에 대해
- When PATCH /api/v1/admin/reports/{reportId}/blind 요청 시
- Then report_status = BLINDED, comments.is_blind = TRUE가 동일 트랜잭션에서 변경된다

**Scenario 3**: MEMBER 블라인드 처리
- Given target_type = MEMBER인 PENDING 신고에 대해
- When PATCH /api/v1/admin/reports/{reportId}/blind 요청 시
- Then report_status = BLINDED만 변경되며 members 테이블은 수정되지 않는다

**Scenario 4**: 이미 처리된 신고
- Given BLINDED 또는 DISMISSED 상태인 신고에 대해
- When PATCH /api/v1/admin/reports/{reportId}/blind 요청 시
- Then 409 ALREADY_PROCESSED를 반환한다

---

### Story 5 — 기각 처리 (P1)

**As** 관리자
**I want** 근거 없는 신고를 기각 처리하고 싶다
**So that** 허위 신고로 인한 콘텐츠 삭제를 방지할 수 있다

**Scenario 1**: 정상 기각 처리
- Given PENDING 상태인 신고에 대해
- When PATCH /api/v1/admin/reports/{reportId}/dismiss 요청 시
- Then report_status = DISMISSED로 변경되고 처리 결과를 반환한다

**Scenario 2**: 이미 처리된 신고
- Given BLINDED 또는 DISMISSED 상태인 신고에 대해
- When PATCH /api/v1/admin/reports/{reportId}/dismiss 요청 시
- Then 409 ALREADY_PROCESSED를 반환한다

---

## Functional Requirements

- FR-001: KPI 요약 API는 전체, 대기(PENDING), 블라인드(BLINDED), 기각(DISMISSED) 건수를 반환해야 한다
- FR-002: 신고 목록은 status, targetType, reason, keyword 필터를 지원해야 한다
- FR-003: 필터 조건이 null이면 해당 조건을 무시하고 전체를 조회해야 한다
- FR-004: 잘못된 Enum 필터 값 입력 시 400 INVALID_REPORT_FILTER를 반환해야 한다
- FR-005: 목록 기본 정렬은 created_at DESC이어야 한다
- FR-006: page는 1-based로 받아 Service에서 0-based로 변환해야 한다
- FR-007: 신고 상세 조회 시 target_type에 따라 boards 또는 comments 테이블에서 콘텐츠를 조회해야 한다
- FR-008: 대상 콘텐츠가 삭제된 경우 contentTitle, contentBody를 null로 반환해야 한다
- FR-009: PENDING이 아닌 신고에 블라인드 또는 기각 처리 시도 시 409 ALREADY_PROCESSED를 반환해야 한다
- FR-010: BOARD 블라인드 처리 시 boards.is_blind = TRUE 변경이 동일 트랜잭션 안에 포함되어야 한다
- FR-011: COMMENT 블라인드 처리 시 comments.is_blind = TRUE 변경이 동일 트랜잭션 안에 포함되어야 한다
- FR-012: MEMBER 블라인드 처리 시 members 테이블을 수정하지 않아야 한다
- FR-013: 처리 응답에는 변경된 reportStatus와 processedAt이 포함되어야 한다
- FR-014: processedBy는 Security Context에서 추출한 관리자 ID를 사용해야 한다
- FR-015: 모든 응답은 ApiResponse<T> 래퍼를 사용해야 한다

---

## Edge Cases

- EC-001: PENDING이 아닌 신고에 블라인드 시도 → 409 ALREADY_PROCESSED
- EC-002: PENDING이 아닌 신고에 기각 시도 → 409 ALREADY_PROCESSED
- EC-003: 신고 대상 게시글이 이미 삭제된 경우 → contentTitle, contentBody null 반환
- EC-004: target_type = MEMBER 블라인드 처리 시 members.member_status 변경 금지
- EC-005: 잘못된 Enum 필터 값(status, targetType, reason) 입력 시 → 400 반환
- EC-006: 존재하지 않는 reportId 조회 시 → 404 REPORT_NOT_FOUND
- EC-007: 블라인드 처리 중 boards/comments 업데이트 실패 시 → 전체 트랜잭션 롤백 후 500 BLIND_PROCESSING_FAILED 반환

---

## ERD

### reports

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| report_id | BIGSERIAL | PK | 신고 고유 식별자 |
| member_id | UUID | FK → members, NOT NULL | 신고당한 회원 |
| reporter_id | UUID | FK → members, NOT NULL | 신고한 회원 |
| target_type | VARCHAR(20) | NOT NULL | BOARD / COMMENT / MEMBER |
| target_id | BIGINT | NOT NULL | 신고 대상 레코드 ID |
| reason | VARCHAR(30) | NOT NULL | SPAM / ABUSE / AD / INAPPROPRIATE / OTHER |
| report_status | VARCHAR(20) | NOT NULL, DEFAULT PENDING | PENDING / BLINDED / DISMISSED |
| ai_suggestion | TEXT | NULL | AI 검토 의견 (v2 UI 표시 예정) |
| processed_by | BIGINT | FK → admins, NULL | 처리 관리자 |
| processed_at | TIMESTAMPTZ | NULL | 처리 완료 일시 |
| created_at | TIMESTAMPTZ | NOT NULL | 신고 접수 일시 |

### boards (연관)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| board_id | BIGSERIAL | PK |
| is_blind | BOOLEAN | 블라인드 처리 여부 |

### comments (연관)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| comment_id | BIGSERIAL | PK |
| is_blind | BOOLEAN | 블라인드 처리 여부 |

---

## 패키지 구조

```text
admin/report/
├── entity/
│   └── Report.java
├── repository/
│   ├── ReportRepository.java
│   ├── ReportQueryRepository.java
│   ├── ReportBoardRepository.java
│   └── ReportCommentRepository.java
├── type/
│   ├── ReportStatus.java
│   ├── TargetType.java
│   └── ReportReason.java
├── service/
│   ├── AdminReportService.java
│   └── impl/
│       └── AdminReportServiceImpl.java
├── controller/
│   └── AdminReportController.java
├── dto/
│   └── ReportDetailDTO.java
├── exception/
│   └── AdminReportErrorCode.java
└── docs/
    └── AdminReportControllerDocs.java
```

---

## Success Criteria

- SC-001: PENDING이 아닌 신고 처리 시 409가 반환된다
- SC-002: BOARD 블라인드 처리 시 boards.is_blind가 동일 트랜잭션에서 변경된다
- SC-003: MEMBER 블라인드 처리 시 members 테이블이 수정되지 않는다
- SC-004: 삭제된 콘텐츠 신고 상세 조회 시 contentTitle, contentBody가 null로 반환된다
- SC-005: 잘못된 필터 값 입력 시 400이 반환된다
- SC-006: 처리 응답에 reportStatus와 processedAt이 포함된다
- SC-007: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| REPORT_NOT_FOUND | 404 | 신고 조회 실패 |
| ALREADY_PROCESSED | 409 | PENDING 아닌 신고 처리 시도 |
| INVALID_REPORT_FILTER | 400 | 잘못된 필터 Enum 값 |
| BLIND_PROCESSING_FAILED | 500 | 블라인드 처리 중 boards/comments 업데이트 실패 |
| UNAUTHORIZED | 401 | 인증 실패 |
