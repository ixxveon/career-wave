# Checklist: 신고관리 API (Report Management)

> 구현 완료 후 PR 제출 전 반드시 확인한다.

---

## Phase 1 — Entity & Enum 체크

- [ ] 모든 Enum 클래스(`ReportStatus`, `TargetType`, `ReportReason`)가 `type/` 패키지에 위치하는가
- [ ] 모든 JPA Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있는가
- [ ] `ReportDetail`에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 적용되어 있는가
- [ ] `ReportDetail` 필드에 public setter가 없는가 (상태 변경은 `blind()`, `dismiss()` 메서드로만)
- [ ] `ReportDetail.reportId`가 Long 타입이고 `@Column(name = "report_id")`가 지정되어 있는가
- [ ] `blind()`, `dismiss()` 메서드가 `processedBy`, `processedAt`을 함께 설정하는가

---

## Phase 2 — Repository 체크

- [ ] 동적 필터(`status` / `targetType` / `reason`) 조건이 null이면 해당 조건이 적용되지 않는가
- [ ] `countByReportStatus(ReportStatus status)` 집계 쿼리가 정확한가
- [ ] 기본 정렬이 `created_at DESC`로 적용되는가

---

## Phase 3 — Service 체크

- [ ] `blindReport()` 메서드에 `@Transactional`이 적용되어 있는가
- [ ] `dismissReport()` 메서드에 `@Transactional`이 적용되어 있는가
- [ ] `PENDING`이 아닌 신고 처리 시도 시 `ALREADY_PROCESSED` 예외가 발생하는가
- [ ] `target_type = BOARD` 블라인드 처리 시 `boards.is_blind = TRUE`가 동일 트랜잭션에서 변경되는가
- [ ] `target_type = COMMENT` 블라인드 처리 시 `comments.is_blind = TRUE`가 동일 트랜잭션에서 변경되는가
- [ ] `target_type = MEMBER` 블라인드 처리 시 콘텐츠 테이블(boards/comments)을 변경하지 않는가
- [ ] `target_type = MEMBER` 블라인드 처리 시 `members.member_status`를 변경하지 않는가
- [ ] 존재하지 않는 신고 조회 시 `REPORT_NOT_FOUND` 예외가 발생하는가
- [ ] `ai_suggestion` 필드가 v1 응답 DTO에 포함되지 않는가
- [ ] `page`가 1-based → 0-based 변환되어 Pageable에 전달되는가
- [ ] 관리자 ID가 Security Context에서 추출되는가 (Controller에서 임의 파싱 없음)

---

## Phase 4 — Controller & Docs 체크

- [ ] 모든 엔드포인트 URL이 `api-schema.md` 계약과 일치하는가
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하고 있지 않은가
- [ ] Controller가 `Map`을 직접 반환하지 않고 `ApiResponse<T>`를 사용하는가
- [ ] Entity를 직접 반환하지 않고 DTO로 변환하여 반환하는가
- [ ] `AdminReportControllerDocs.java`에 Swagger 어노테이션이 분리되어 있는가
- [ ] `ROLE_ADMIN` 권한 검증이 모든 엔드포인트에 적용되어 있는가

---

## Phase 5 — 최종 확인

- [ ] Swagger UI에서 모든 API의 요청/응답 형식을 확인하였는가
- [ ] 프론트엔드 `api-schema.md`의 요청/응답 필드와 실제 응답이 일치하는가
- [ ] `target_type = BOARD` 블라인드 처리 중 예외 발생 시 `boards.is_blind` 변경이 롤백되는가
- [ ] `ALREADY_PROCESSED` 응답이 HTTP 409 상태코드로 반환되는가
- [ ] `CustomException`이 `GlobalExceptionHandler`에서 `ApiResponse.fail()`로 변환되는가
- [ ] `new RuntimeException(...)` 직접 생성 코드가 없는가
