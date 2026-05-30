# Checklist: 고객센터 관리 API (Customer Service)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.
> 구현 전 설계 검증 + 구현 후 동작 검증 항목을 포함한다.

---

## Phase 1 — ERD & Enum 정합성

- [ ] `NoticeCategory` 값이 ERD CHECK 제약 기준 `NOTICE / UPDATE / EVENT / MAINTENANCE`만 사용한다.
- [ ] `FaqCategory` 값이 ERD CHECK 제약 기준 `ACCOUNT / PAYMENT / SERVICE / ETC`만 사용한다.
- [ ] `InquiryCategory` 값이 ERD CHECK 제약 기준 `REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC`만 사용한다.
- [ ] `InquiryStatus` 값이 ERD CHECK 제약 기준 `PENDING / IN_PROGRESS / COMPLETED`만 사용한다.
- [ ] 모든 Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있다.
- [ ] Entity PK 전략이 `GenerationType.IDENTITY`를 사용한다.
- [ ] Entity PK 필드명이 `noticeId`, `faqId`, `inquiryId` 형식(단수 camelCase)을 따른다. (CONVENTION.md)
- [ ] DB PK 컬럼명이 `notice_id`, `faq_id`, `inquiry_id` 형식(snake_case)을 따른다. (CONVENTION.md)

---

## Phase 2 — Entity 설계

- [ ] 모든 Entity에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 선언되어 있다.
- [ ] 모든 Entity에 public setter가 없다.
- [ ] `Notice.update(...)` 메서드가 `updatedAt`을 갱신한다.
- [ ] `Faq.update(...)` 메서드가 `updatedAt`을 갱신한다.
- [ ] `Inquiry.saveReply(...)` 메서드가 `inquiryStatus → IN_PROGRESS` 전이 및 `repliedAt`(최초만) 설정한다.
- [ ] `Inquiry.complete()` 메서드가 `inquiryStatus → COMPLETED` 전이 및 `completedAt` 설정한다.
- [ ] `admin/cs/` 패키지가 `user/` 패키지 클래스를 직접 참조하지 않는다.

---

## Phase 3 — 상태 전이 정합성

- [ ] `COMPLETED` 문의에 답변 저장 요청 시 `INQUIRY_ALREADY_COMPLETED(409)`가 반환된다.
- [ ] `PENDING` 문의에 처리 완료 요청 시 `INQUIRY_NOT_IN_PROGRESS(400)`이 반환된다.
- [ ] `IN_PROGRESS` 문의에 답변 재저장 시 `inquiryStatus`가 변경되지 않고 `reply`만 업데이트된다.
- [ ] `IN_PROGRESS` 문의에 처리 완료 요청 시 `inquiryStatus → COMPLETED`로 변경된다.
- [ ] 답변 저장 성공 응답에 `inquiryStatus`, `repliedAt`이 포함된다.
- [ ] 처리 완료 성공 응답에 `inquiryStatus`, `completedAt`이 포함된다.

---

## Phase 4 — API 응답 형식

- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼를 사용한다.
- [ ] Entity 또는 Spring `Page<T>` 객체를 직접 반환하지 않는다.
- [ ] 목록 조회 응답이 `items`, `page`, `size`, `totalItems`, `totalPages` 키를 포함한다.
- [ ] `page=1` 요청 시 첫 번째 페이지 결과가 반환된다. (1-based → 0-based 변환 확인)
- [ ] 공지사항 등록 응답 HTTP 상태 코드가 201이다.
- [ ] FAQ 등록 응답 HTTP 상태 코드가 201이다.
- [ ] 삭제 응답 `data`가 `null`이다.

---

## Phase 5 — ErrorCode & 예외 처리

- [ ] `NOTICE_NOT_FOUND`, `FAQ_NOT_FOUND`, `INQUIRY_NOT_FOUND` (404)가 `ErrorCode`에 등록되어 있다.
- [ ] `INQUIRY_ALREADY_COMPLETED` (409), `INQUIRY_NOT_IN_PROGRESS` (400)이 `ErrorCode`에 등록되어 있다.
- [ ] `AI_SERVER_UNAVAILABLE` (503)이 `ErrorCode`에 등록되어 있다.
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하지 않는다. `GlobalExceptionHandler`에 위임한다.
- [ ] `new RuntimeException(...)`을 직접 생성하지 않는다. `CustomException(ErrorCode.xxx)`를 사용한다.

---

## Phase 6 — 도메인 분리 & 컨벤션

- [ ] `admin/cs/` 패키지가 `user/` 패키지를 직접 참조하지 않는다.
- [ ] DTO가 inner class 패턴(`NoticeDTO.RequestCreate`, `NoticeDTO.ResponseList` 등)을 사용한다.
- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
- [ ] 관리자 ID가 `@AuthenticationPrincipal`로 추출된다. (Controller에서 임의 파싱 금지)
- [ ] ADMIN 권한 검사가 적용되어 있다.

---

## Phase 7 — AI 초안 & FastAPI 연동

- [ ] AI 초안 엔드포인트가 외부에 직접 노출되지 않고 Spring → FastAPI 내부 호출 방식을 사용한다.
- [ ] FastAPI 타임아웃(10초) 초과 시 `AI_SERVER_UNAVAILABLE(503)`이 반환된다.
- [ ] AI 서버 장애 시 공지사항·FAQ·문의 CRUD 기능이 정상 동작한다.
