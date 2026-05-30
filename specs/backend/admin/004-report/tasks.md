# Tasks: 신고관리 API (Report Management)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Entity & Enum 정의

### Enum (type/)

- [ ] `ReportStatus.java` — PENDING / BLINDED / DISMISSED
- [ ] `TargetType.java` — BOARD / COMMENT / MEMBER
- [ ] `ReportReason.java` — SPAM / ABUSE / AD / INAPPROPRIATE / OTHER

### Entity (entity/)

- [ ] `ReportDetail.java`
  - [ ] `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "report_id") Long reportId`
  - [ ] `@Enumerated(EnumType.STRING)` — `targetType`, `reason`, `reportStatus` 모든 Enum 필드 적용
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `blind(Long adminId)` 메서드 — `reportStatus → BLINDED`, `processedBy`, `processedAt` 설정
  - [ ] `dismiss(Long adminId)` 메서드 — `reportStatus → DISMISSED`, `processedBy`, `processedAt` 설정

---

## Phase 2 — Repository 구현

- [ ] `ReportDetailRepository.java`
  - [ ] 동적 필터 쿼리 (`status` / `targetType` / `reason` — null이면 해당 조건 미적용)
  - [ ] `countByReportStatus(ReportStatus status)` — KPI 집계용
  - [ ] 기본 정렬 `created_at DESC`
- [ ] `ReportBoardRepository.java` — `boards` 테이블 접근용 admin 전용 Repository (`boardId`, `isBlind` 필드만)
- [ ] `ReportCommentRepository.java` — `comments` 테이블 접근용 admin 전용 Repository (`commentId`, `isBlind` 필드만)

> `user/` 패키지의 BoardRepository/CommentRepository를 직접 import하지 않는다. admin 전용 Repository를 별도 정의하여 같은 테이블에 접근한다.

---

## Phase 3 — Service 구현

### AdminReportService

- [ ] `getSummary()`
  - [ ] 전체 신고 수 COUNT
  - [ ] PENDING / BLINDED / DISMISSED 각 COUNT
  - [ ] `ResponseSummary` 반환

- [ ] `getReports(status, targetType, reason, page, size)`
  - [ ] 동적 필터 + 페이지네이션 (`page` 1-based → 0-based 변환)
  - [ ] 기본 정렬: `createdAt DESC`
  - [ ] Map(`items`, `page`, `size`, `totalItems`, `totalPages`) 반환

- [ ] `getReportDetail(Long reportId)`
  - [ ] `REPORT_NOT_FOUND` 예외 처리
  - [ ] `targetType`에 따라 boards / comments 테이블에서 콘텐츠 조회
  - [ ] 대상이 삭제된 경우 `contentTitle`, `contentBody` → null 처리
  - [ ] `ResponseDetail` 반환

- [ ] `blindReport(Long reportId, Long adminId)`
  - [ ] `REPORT_NOT_FOUND` 예외 처리
  - [ ] `reportStatus != PENDING` → `ALREADY_PROCESSED(409)` 예외
  - [ ] `targetType = BOARD` → `boardRepository.findById(targetId)` → `isBlind = true` 변경
  - [ ] `targetType = COMMENT` → `commentRepository.findById(targetId)` → `isBlind = true` 변경
  - [ ] `targetType = MEMBER` → is_blind 변경 없음
  - [ ] `reportDetail.blind(adminId)` 호출
  - [ ] `@Transactional` 적용
  - [ ] `ResponseProcess` 반환

- [ ] `dismissReport(Long reportId, Long adminId)`
  - [ ] `REPORT_NOT_FOUND` 예외 처리
  - [ ] `reportStatus != PENDING` → `ALREADY_PROCESSED(409)` 예외
  - [ ] `reportDetail.dismiss(adminId)` 호출
  - [ ] `@Transactional` 적용
  - [ ] `ResponseProcess` 반환

---

## Phase 4 — Controller & Swagger Docs

- [ ] `AdminReportController.java`
  - [ ] `GET /api/admin/reports/summary`
  - [ ] `GET /api/admin/reports`
  - [ ] `GET /api/admin/reports/{reportId}`
  - [ ] `PATCH /api/admin/reports/{reportId}/blind`
  - [ ] `PATCH /api/admin/reports/{reportId}/dismiss`
  - [ ] Security Context에서 관리자 ID 추출
  - [ ] `@PreAuthorize("hasRole('ADMIN')")` 또는 Security Config 적용
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] `AdminReportControllerDocs.java` — Swagger 어노테이션 분리

### ErrorCode 추가 (global/exception/ErrorCode)

- [ ] `REPORT_NOT_FOUND`
- [ ] `ALREADY_PROCESSED` (회원관리에서 이미 추가한 경우 재사용)
- [ ] `INVALID_REPORT_FILTER`

---

## Phase 5 — 문서화 & 테스트

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] 프론트엔드 `api-schema.md` 계약과 실제 응답 일치 여부 검증
- [ ] `target_type = BOARD` 블라인드 처리 시 `boards.is_blind = TRUE` 동시 변경 확인
- [ ] `target_type = COMMENT` 블라인드 처리 시 `comments.is_blind = TRUE` 동시 변경 확인
- [ ] `target_type = MEMBER` 블라인드 처리 시 콘텐츠 테이블 변경 없음 확인
- [ ] `BLINDED / DISMISSED` 신고 재처리 시도 → `ALREADY_PROCESSED(409)` 응답 확인
- [ ] 블라인드 처리 중 예외 발생 시 트랜잭션 롤백 확인
