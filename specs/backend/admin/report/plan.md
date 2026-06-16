# Plan: 신고관리 API (Report Management)

**Feature Branch**: `feature/admin-report-api`
**담당**: 신보라
**Status**: 구현 예정

---

## 프로젝트 구조

```text
backend/src/main/java/kr/co/carrer/admin/report/
├── entity/
│   └── Report.java                    # reports 테이블 엔티티
├── repository/
│   ├── ReportRepository.java          # JpaRepository<Report, Long>
│   ├── ReportQueryRepository.java     # Native Query 목록/요약 조회
│   ├── ReportBoardRepository.java     # boards is_blind 업데이트
│   └── ReportCommentRepository.java   # comments is_blind 업데이트
├── type/
│   ├── ReportStatus.java              # PENDING, BLINDED, DISMISSED
│   ├── TargetType.java                # BOARD, COMMENT, MEMBER
│   └── ReportReason.java             # SPAM, ABUSE, AD, INAPPROPRIATE, OTHER
├── service/
│   ├── AdminReportService.java        # 인터페이스
│   └── impl/
│       └── AdminReportServiceImpl.java
├── controller/
│   └── AdminReportController.java
├── dto/
│   └── ReportDetailDTO.java           # 상세 조회 DTO
├── exception/
│   └── AdminReportErrorCode.java      # REPORT_NOT_FOUND, ALREADY_PROCESSED, INVALID_REPORT_FILTER
└── docs/
    └── AdminReportControllerDocs.java # Swagger 인터페이스
```

---


## 구현 진행 체크리스트

- [ ] Phase 1: 엔티티 및 레포지토리
- [ ] Phase 2: 서비스 레이어
- [ ] Phase 3: 컨트롤러
- [ ] Phase 4: 검증
## Phase 1 — 엔티티 및 레포지토리

### 작업 목록

1. `Report.java` 엔티티 작성
   - `@Entity @Table(name = "reports")`
   - 필드: reportId, memberId, reporterId, targetType, targetId, reason, reportStatus, aiSuggestion, processedBy, processedAt, createdAt
   - `@Enumerated(EnumType.STRING)` → targetType, reason, reportStatus

2. Enum 타입 작성
   - `ReportStatus`: PENDING, BLINDED, DISMISSED
   - `TargetType`: BOARD, COMMENT, MEMBER
   - `ReportReason`: SPAM, ABUSE, AD, INAPPROPRIATE, OTHER

3. `ReportRepository.java` 작성
   - `JpaRepository<Report, Long>` 상속

4. `ReportQueryRepository.java` 작성 (Native Query 패턴)
   - `EntityManager` 주입
   - `getReportSummary()` → PENDING/BLINDED/DISMISSED 카운트 집계
   - `getReportList(status, targetType, reason, keyword, page, size)` → 필터 조회
   - `countReports(status, targetType, reason, keyword)` → 페이징 total 계산
   - `:param` 네임드 파라미터 사용, 동적 조건 StringBuilder로 조립

5. `ReportBoardRepository.java` 작성
   - `@Modifying @Query("UPDATE boards SET is_blind = TRUE WHERE board_id = :boardId")`

6. `ReportCommentRepository.java` 작성
   - `@Modifying @Query("UPDATE comments SET is_blind = TRUE WHERE comment_id = :commentId")`

---

## Phase 2 — 서비스 레이어

### 작업 목록

1. `AdminReportService.java` 인터페이스 작성
   - `ReportSummaryResponse getSummary()`
   - `PageResponse<ReportListItemResponse> getReportList(...)`
   - `ReportDetailResponse getReportDetail(Long reportId)`
   - `ReportActionResponse blindReport(Long reportId)`
   - `ReportActionResponse dismissReport(Long reportId)`

2. `AdminReportServiceImpl.java` 구현
   - `getSummary()`: `@Transactional(readOnly = true)` — queryRepository 집계 호출
   - `getReportList()`: `@Transactional(readOnly = true)` — page 1-based → 0-based 변환
   - `getReportDetail()`: `@Transactional(readOnly = true)` — targetType에 따라 boards/comments 조인
   - `blindReport()`:
     - `@Transactional`
     - PENDING 아니면 409 ALREADY_PROCESSED throw
     - targetType == BOARD → reportBoardRepository.blindBoard(targetId)
     - targetType == COMMENT → reportCommentRepository.blindComment(targetId)
     - targetType == MEMBER → boards/comments 수정 없음
     - report.reportStatus = BLINDED, processedAt = now()
   - `dismissReport()`:
     - `@Transactional`
     - PENDING 아니면 409 ALREADY_PROCESSED throw
     - report.reportStatus = DISMISSED, processedAt = now()

3. `AdminReportErrorCode.java` 작성
   - REPORT_NOT_FOUND (404)
   - ALREADY_PROCESSED (409)
   - INVALID_REPORT_FILTER (400)

---

## Phase 3 — 컨트롤러

### 작업 목록

1. `AdminReportController.java` 작성
   - `GET  /api/admin/reports/summary` → `getSummary()`
   - `GET  /api/admin/reports` → `getReportList(status, targetType, reason, keyword, page, size)`
   - `GET  /api/admin/reports/{reportId}` → `getReportDetail(reportId)`
   - `PATCH /api/admin/reports/{reportId}/blind` → `blindReport(reportId)`
   - `PATCH /api/admin/reports/{reportId}/dismiss` → `dismissReport(reportId)`

2. `AdminReportControllerDocs.java` 인터페이스 작성
   - Swagger @Operation, @ApiResponse 정의
   - @SecurityRequirement(name = "bearerAuth")

---

## Phase 4 — 검증

### 체크리스트

- [ ] PENDING이 아닌 신고에 blind/dismiss 요청 시 409 반환
- [ ] BOARD 블라인드 처리 시 boards.is_blind = TRUE 변경 확인
- [ ] COMMENT 블라인드 처리 시 comments.is_blind = TRUE 변경 확인
- [ ] MEMBER 블라인드 처리 시 members 테이블 미변경 확인
- [ ] 삭제된 콘텐츠 신고 상세 조회 시 contentTitle, contentBody null 반환
- [ ] 잘못된 필터 Enum 값 입력 시 400 반환
- [ ] 목록 기본 정렬 created_at DESC 확인
- [ ] 처리 응답에 reportStatus, processedAt 포함 확인
- [ ] 모든 응답 ApiResponse<T> 래퍼 확인
