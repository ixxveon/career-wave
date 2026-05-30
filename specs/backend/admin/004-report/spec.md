# Spec: 신고관리 API (Report Management)

**Feature Branch**: `feature/admin-report-api`
**버전**: v1
**Status**: 스펙 작성 중
**담당**: 신보라

---

## 도메인 개요

커뮤니티 게시글·댓글·회원에 대한 신고 내역을 관리자가 조회하고,
블라인드 처리 또는 기각 처리를 수행하는 어드민 API.

- `target_type = BOARD` 블라인드 처리: `reports_details.report_status → BLINDED` + `boards.is_blind → TRUE` (동일 트랜잭션)
- `target_type = COMMENT` 블라인드 처리: `reports_details.report_status → BLINDED` + `comments.is_blind → TRUE` (동일 트랜잭션)
- `target_type = MEMBER` 블라인드 처리: `reports_details.report_status → BLINDED`만 변경 (콘텐츠 블라인드 없음)

---

## ERD

### reports_details

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `report_id` | BIGSERIAL | PK | 신고 고유 식별자 |
| `member_id` | UUID | FK → members, NOT NULL | 신고당한 회원 |
| `reporter_id` | UUID | FK → members, NOT NULL | 신고한 회원 |
| `target_type` | VARCHAR(20) | NOT NULL | `BOARD` / `COMMENT` / `MEMBER` |
| `target_id` | BIGINT | NOT NULL | 신고 대상 레코드 ID |
| `reason` | VARCHAR(30) | NOT NULL | `SPAM` / `ABUSE` / `AD` / `INAPPROPRIATE` / `OTHER` |
| `report_status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | `PENDING` / `BLINDED` / `DISMISSED` |
| `ai_suggestion` | TEXT | NULL | AI 검토 의견 (v2 UI 표시 예정) |
| `processed_by` | BIGINT | FK → admins, NULL | 처리 관리자 |
| `processed_at` | TIMESTAMPTZ | NULL | 처리 완료 일시 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 신고 접수 일시 |

### boards (연관)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `board_id` | BIGSERIAL | PK | 게시글 고유 식별자 |
| `is_blind` | BOOLEAN | NOT NULL, DEFAULT FALSE | 블라인드 처리 여부 |

### comments (연관)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `comment_id` | BIGSERIAL | PK | 댓글 고유 식별자 |
| `is_blind` | BOOLEAN | NOT NULL, DEFAULT FALSE | 블라인드 처리 여부 |

---

## 패키지 구조

```
admin/report/
├── entity/
│   └── ReportDetail.java
├── repository/
│   └── ReportDetailRepository.java
├── type/
│   ├── ReportStatus.java      — PENDING / BLINDED / DISMISSED
│   ├── TargetType.java        — BOARD / COMMENT / MEMBER
│   └── ReportReason.java      — SPAM / ABUSE / AD / INAPPROPRIATE / OTHER
├── service/
│   └── AdminReportService.java
├── controller/
│   └── AdminReportController.java
├── dto/
│   └── ReportDetailDTO.java
└── docs/
    └── AdminReportControllerDocs.java
```

---

## Entity

### ReportDetail.java

```java
@Entity
@Table(name = "reports_details")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Long reportId;

    @Column(name = "member_id", nullable = false)
    private UUID memberId;       // 피신고자

    @Column(name = "reporter_id", nullable = false)
    private UUID reporterId;     // 신고자

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false)
    private TargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false)
    private ReportReason reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "report_status", nullable = false)
    private ReportStatus reportStatus;

    @Column(name = "ai_suggestion")
    private String aiSuggestion;

    @Column(name = "processed_by")
    private Long processedBy;

    @Column(name = "processed_at")
    private ZonedDateTime processedAt;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt;

    // 블라인드 처리
    public void blind(Long adminId) {
        this.reportStatus = ReportStatus.BLINDED;
        this.processedBy = adminId;
        this.processedAt = ZonedDateTime.now();
    }

    // 기각 처리
    public void dismiss(Long adminId) {
        this.reportStatus = ReportStatus.DISMISSED;
        this.processedBy = adminId;
        this.processedAt = ZonedDateTime.now();
    }
}
```

---

## DTO 구조

```java
public class ReportDetailDTO {

    // 목록 항목
    public record ResponseList(
        Long reportId,
        TargetType targetType,
        ReportReason reason,
        ReportStatus reportStatus,
        ZonedDateTime createdAt
    ) {}

    // KPI 집계
    public record ResponseSummary(
        long totalCount,
        long pendingCount,
        long blindedCount,
        long dismissedCount
    ) {}

    // 상세 조회
    public record ResponseDetail(
        Long reportId,
        TargetType targetType,
        Long targetId,
        ReportReason reason,
        ReportStatus reportStatus,
        String reporterName,
        String reportedName,
        String contentTitle,   // BOARD 시 게시글 제목, 그 외 null
        String contentBody,    // 대상 콘텐츠 본문 (삭제 시 null)
        ZonedDateTime createdAt,
        ZonedDateTime processedAt,
        Long processedBy
    ) {}

    // 블라인드·기각 처리 응답
    public record ResponseProcess(
        Long reportId,
        ReportStatus reportStatus,
        ZonedDateTime processedAt
    ) {}
}
```

---

## API 명세

### 1. KPI 집계 조회

```
GET /api/admin/reports/summary
```

- **응답**: `ApiResponse<ReportDetailDTO.ResponseSummary>`
- 전체·접수·블라인드·기각 건수 반환

---

### 2. 신고 목록 조회

```
GET /api/admin/reports?status=&targetType=&reason=&page=&size=
```

- **응답**: `ApiResponse<Map<String, Object>>` (`items`, `page`, `size`, `totalItems`, `totalPages`)
- 필터 조건 없으면 전체 반환
- 기본 정렬: `created_at DESC`

---

### 3. 신고 상세 조회

```
GET /api/admin/reports/{reportId}
```

- **응답**: `ApiResponse<ReportDetailDTO.ResponseDetail>`
- `target_type`에 따라 boards 또는 comments 테이블에서 콘텐츠 조회
- 대상 콘텐츠가 삭제된 경우 `contentTitle`, `contentBody` → null 반환

---

### 4. 블라인드 처리

```
PATCH /api/admin/reports/{reportId}/blind
```

- **응답**: `ApiResponse<ReportDetailDTO.ResponseProcess>`
- `PENDING` 신고만 처리 가능
- `target_type = BOARD` → `boards.is_blind = TRUE` 동시 변경 (동일 트랜잭션)
- `target_type = COMMENT` → `comments.is_blind = TRUE` 동시 변경 (동일 트랜잭션)
- `target_type = MEMBER` → `report_status = BLINDED`만 변경

---

### 5. 기각 처리

```
PATCH /api/admin/reports/{reportId}/dismiss
```

- **응답**: `ApiResponse<ReportDetailDTO.ResponseProcess>`
- `PENDING` 신고만 처리 가능

---

## 서비스 로직

### AdminReportService

#### getSummary()
- `reports_details` 테이블에서 전체·상태별 COUNT 집계

#### getReports(status, targetType, reason, page, size)
- 동적 필터 조건 (null이면 필터 미적용)
- `page`는 1-based → 0-based 변환 후 Pageable에 전달
- 기본 정렬: `createdAt DESC`

#### getReportDetail(Long reportId)
- `REPORT_NOT_FOUND` 예외 처리
- `targetType`에 따라 boards 또는 comments 테이블에서 콘텐츠 조회

#### blindReport(Long reportId, Long adminId)
- `REPORT_NOT_FOUND` 예외 처리
- `PENDING`이 아니면 `ALREADY_PROCESSED` 예외
- `targetType = BOARD` → `boardRepository.findById(targetId)`에서 `is_blind = true` 변경
- `targetType = COMMENT` → `commentRepository.findById(targetId)`에서 `is_blind = true` 변경
- `targetType = MEMBER` → is_blind 변경 없음
- `reportDetail.blind(adminId)` 호출
- `@Transactional` 적용

#### dismissReport(Long reportId, Long adminId)
- `REPORT_NOT_FOUND` 예외 처리
- `PENDING`이 아니면 `ALREADY_PROCESSED` 예외
- `reportDetail.dismiss(adminId)` 호출
- `@Transactional` 적용

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `REPORT_NOT_FOUND` | 404 | 신고 조회 실패 |
| `ALREADY_PROCESSED` | 409 | PENDING 아닌 신고 처리 시도 |
| `INVALID_REPORT_FILTER` | 400 | 잘못된 필터 Enum 값 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
