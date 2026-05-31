# Checklist: 사용자 고객센터 API (User Support)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — DTO & 설계

- [ ] `SupportDTO.java`에 inner class 6종이 선언되어 있다.
- [ ] `RequestCreateInquiry.content`에 `@Size(min=10)` 검증이 적용되어 있다.
- [ ] `user/support/` 패키지가 `admin/cs/` 패키지를 직접 참조하지 않는다.

---

## Phase 2 — 비즈니스 로직

- [ ] 공지사항 목록 조회 시 `is_visible = true` 조건이 항상 적용된다.
- [ ] 공지사항 목록이 `is_pinned DESC, created_at DESC` 순으로 정렬된다.
- [ ] `is_visible = false` 공지 상세 조회 시 `NOTICE_NOT_FOUND(404)`가 반환된다.
- [ ] 공지 상세 조회 시 `view_count`가 `@Transactional` 내에서 1 증가한다.
- [ ] FAQ 목록이 `keyword`로 질문·답변 모두 검색된다.
- [ ] 문의 목록 조회 시 `member_id = 인증된 회원 ID` 조건이 항상 적용된다.
- [ ] 문의 접수 시 `inquiry_status`가 반드시 `PENDING`으로 설정된다.

---

## Phase 3 — API 응답 형식

- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼를 사용한다.
- [ ] 공지사항 목록 응답이 `PaginationResponse<T>` 형식을 사용한다.
- [ ] FAQ·문의 목록 응답에 페이지네이션이 적용되지 않는다 (전체 목록 반환).
- [ ] 문의 접수 성공 응답이 HTTP 201로 반환된다.
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하지 않는다.

---

## Phase 4 — Security

- [ ] `GET /api/notices/**`, `GET /api/faqs/**`가 비인증 상태에서 접근 가능하다.
- [ ] `GET /api/inquiries`, `POST /api/inquiries`가 미인증 상태에서 401을 반환한다.
- [ ] 타인 member_id로 조회해도 본인 건만 반환된다.

---

## Phase 5 — 도메인 분리

- [ ] `user/support/` 패키지가 `admin/cs/` 패키지를 직접 참조하지 않는다.
- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
- [ ] 관리자 ID가 아닌 `@AuthenticationPrincipal`로 회원 ID가 추출된다.
