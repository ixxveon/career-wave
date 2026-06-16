# Plan: 신고관리 API (Report Management)

**Feature Branch**: `feature/admin-report-api`
**담당**: 신보라
**Status**: 구현 예정

---

## Summary

커뮤니티 게시글·댓글·회원 신고 내역 조회 및 블라인드·기각 처리 어드민 REST API.
블라인드 처리 시 boards/comments 테이블을 동일 트랜잭션에서 업데이트한다.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/report/`
- Native Query 패턴 (EntityManager 직접 사용)
- 연관 테이블: `reports`, `boards`, `comments`

---

## Project Structure

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
│   ├── ReportStatus.java              -- PENDING / BLINDED / DISMISSED
│   ├── TargetType.java                -- BOARD / COMMENT / MEMBER
│   └── ReportReason.java             -- SPAM / ABUSE / AD / INAPPROPRIATE / OTHER
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

## Phases

- [ ] Phase 1: 엔티티 및 레포지토리
  - `Report.java` 엔티티 — `@Enumerated(EnumType.STRING)` targetType, reason, reportStatus
  - `ReportStatus`, `TargetType`, `ReportReason` Enum 작성
  - `ReportRepository.java` — `JpaRepository<Report, Long>`
  - `ReportQueryRepository.java` — Native Query 목록/요약 조회, `:param` 네임드 파라미터
  - `ReportBoardRepository.java` — `@Modifying` boards.is_blind 업데이트
  - `ReportCommentRepository.java` — `@Modifying` comments.is_blind 업데이트

- [ ] Phase 2: 서비스 레이어
  - `AdminReportService.java` 인터페이스 — getSummary / getReportList / getReportDetail / blindReport / dismissReport
  - `getSummary()` — `@Transactional(readOnly = true)`
  - `getReportList()` — `@Transactional(readOnly = true)`, page 1-based → 0-based 변환
  - `getReportDetail()` — `@Transactional(readOnly = true)`, REPORT_NOT_FOUND(404)
  - `blindReport()` — `@Transactional`, PENDING 검증 → ALREADY_PROCESSED(409), targetType별 분기 처리
  - `dismissReport()` — `@Transactional`, PENDING 검증 → ALREADY_PROCESSED(409)
  - `AdminReportErrorCode.java` — REPORT_NOT_FOUND(404), ALREADY_PROCESSED(409), INVALID_REPORT_FILTER(400)

- [ ] Phase 3: 컨트롤러
  - `AdminReportController.java` — 5개 엔드포인트 (`/api/v1/admin/reports/...`)
  - `AdminReportControllerDocs.java` — Swagger `@Operation`, `@ApiResponse` 분리

- [ ] Phase 4: 검증
  - PENDING 아닌 신고 처리 시 409 반환 확인
  - BOARD 블라인드 처리 시 boards.is_blind 동일 트랜잭션 변경 확인
  - MEMBER 블라인드 처리 시 members 테이블 미변경 확인
  - 삭제된 콘텐츠 신고 상세 조회 시 null 반환 확인
  - 모든 응답 ApiResponse<T> 래퍼 확인