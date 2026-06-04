# Checklist: 회원관리 API (Member Management)

> 구현 완료 후 PR 제출 전 반드시 확인한다.

---

## Phase 1 — Entity & Enum 체크

- [ ] 모든 Enum 클래스가 `type/` 패키지에 위치하는가
- [ ] 모든 JPA Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있는가
- [ ] Entity에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 적용되어 있는가
- [ ] Entity 필드에 public setter가 없는가 (상태 변경은 의미 있는 메서드로만)
- [ ] `Member.memberId`가 UUID 타입이고 `@Column(name = "member_id")`가 지정되어 있는가
- [ ] `HrManager.hrManagerId`가 Long 타입이고 `@Column(name = "hr_manager_id")`가 지정되어 있는가

---

## Phase 2 — Repository 체크

- [ ] 동적 필터(role / status / plan / keyword / startDate / endDate) 조건이 누락 없이 적용되는가
- [ ] `pendingCount` 집계가 별도 쿼리 또는 subquery로 정확히 반환되는가
- [ ] company_profiles JOIN이 admin ↔ user 직접 참조 없이 구현되었는가

---

## Phase 3 — Service 체크

- [ ] 제재 처리 메서드에 `@Transactional`이 적용되어 있는가
- [ ] 승인/반려 처리 메서드에 `@Transactional`이 적용되어 있는가
- [ ] `BANNED` 회원 재제재 시 `ALREADY_BANNED` 예외가 발생하는가
- [ ] `PENDING`이 아닌 기업 회원 승인/반려 시 `ALREADY_PROCESSED` 예외가 발생하는가
- [ ] SUSPEND 시 duration null이면 `INVALID_SANCTION_DURATION` 예외가 발생하는가
- [ ] reason/rejectReason 미입력 → `REASON_REQUIRED`, 10자 미만 → `REASON_TOO_SHORT` 예외가 발생하는가
- [ ] 페이지 번호가 1-based → 0-based 변환되어 Pageable에 전달되는가
- [ ] 관리자 ID가 Security Context에서 추출되는가 (Controller에서 임의 파싱 없음)

---

## Phase 4 — Controller & Docs 체크

- [ ] 모든 엔드포인트 URL이 `api-schema.md` 계약과 일치하는가
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하고 있지 않은가
- [ ] Controller가 `Map`을 직접 반환하지 않고 `ApiResponse<T>`를 사용하는가
- [ ] Entity를 직접 반환하지 않고 DTO로 변환하여 반환하는가
- [ ] `AdminMemberControllerDocs.java`에 Swagger 어노테이션이 분리되어 있는가
- [ ] ROLE_ADMIN 권한 검증이 모든 엔드포인트에 적용되어 있는가

---

## Phase 5 — 최종 확인

- [ ] Swagger UI에서 모든 API의 요청/응답 형식을 확인하였는가
- [ ] 프론트엔드 `api-schema.md`의 요청/응답 필드와 실제 응답이 일치하는가
- [ ] 제재 처리 중 예외 발생 시 트랜잭션이 롤백되는가
- [ ] `CustomException`이 `GlobalExceptionHandler`에서 `ApiResponse.fail()`로 변환되는가
- [ ] `new RuntimeException(...)` 직접 생성 코드가 없는가
