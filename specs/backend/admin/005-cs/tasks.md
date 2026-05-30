# Tasks: 고객센터 관리 API (Customer Service)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Enum & Entity 정의

### Enum (type/)

- [ ] `NoticeCategory.java` — `NOTICE / UPDATE / EVENT / MAINTENANCE`
- [ ] `FaqCategory.java` — `ACCOUNT / PAYMENT / SERVICE / ETC`
- [ ] `InquiryCategory.java` — `REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC`
- [ ] `InquiryStatus.java` — `PENDING / IN_PROGRESS / COMPLETED`

### Entity (entity/)

- [ ] `Notice.java`
  - [ ] `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "notice_id") Long noticeId`
  - [ ] `@Enumerated(EnumType.STRING) @Column(name = "category") NoticeCategory category`
  - [ ] `@Column(name = "is_visible", nullable = false) boolean isVisible`
  - [ ] `@Column(name = "created_at", updatable = false)`, `@Column(name = "updated_at")`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `static Notice create(...)` 팩토리 메서드
  - [ ] `update(category, title, content, isVisible)` 비즈니스 메서드 — `updatedAt` 갱신 포함

- [ ] `Faq.java`
  - [ ] `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "faq_id") Long faqId`
  - [ ] `@Enumerated(EnumType.STRING) @Column(name = "category") FaqCategory category`
  - [ ] `@Column(name = "created_at", updatable = false)`, `@Column(name = "updated_at")`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `static Faq create(...)` 팩토리 메서드
  - [ ] `update(category, question, answer)` 비즈니스 메서드 — `updatedAt` 갱신 포함

- [ ] `Inquiry.java`
  - [ ] `@Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(name = "inquiry_id") Long inquiryId`
  - [ ] `@Column(name = "member_id", columnDefinition = "UUID") UUID memberId`
  - [ ] `@Column(name = "admin_id") Long adminId` — nullable (PENDING 시 NULL 허용)
  - [ ] `@Enumerated(EnumType.STRING) @Column(name = "category") InquiryCategory category`
  - [ ] `@Enumerated(EnumType.STRING) @Column(name = "inquiry_status") InquiryStatus inquiryStatus`
  - [ ] `@Column(name = "replied_at")`, `@Column(name = "completed_at")`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `saveReply(String reply, Long adminId)` 비즈니스 메서드
    - `inquiryStatus → IN_PROGRESS` 설정
    - `repliedAt == null`이면 `repliedAt = now()` 설정 (최초 답변 시각만 기록)
    - `updatedAt` 갱신
  - [ ] `complete()` 비즈니스 메서드
    - `inquiryStatus → COMPLETED` 설정
    - `completedAt = now()` 설정
    - `updatedAt` 갱신

---

## Phase 2 — Repository 구현

- [ ] `NoticeRepository.java`
  - [ ] 동적 필터 쿼리 (`category`, `visible` — null이면 해당 조건 미적용)
  - [ ] 기본 정렬 `createdAt DESC`

- [ ] `FaqRepository.java`
  - [ ] 동적 필터 쿼리 (`category` — null이면 미적용)
  - [ ] 기본 정렬 `createdAt DESC`

- [ ] `InquiryRepository.java`
  - [ ] 동적 필터 쿼리 (`category`, `status`, `keyword(title LIKE)` — null이면 미적용)
  - [ ] `countByInquiryStatus(InquiryStatus status)` — KPI 집계용
  - [ ] 기본 정렬 `createdAt DESC`
  - [ ] `memberName` 포함을 위한 members 테이블 조인 쿼리

> `user/` 패키지의 MemberRepository를 직접 import하지 않는다.
> members 테이블 조인은 admin 전용 Repository 내 JPQL 또는 QueryDSL로 처리한다.

---

## Phase 3 — Service 구현

### AdminNoticeService

- [ ] `getNotices(category, visible, page, size)` — 동적 필터 + 페이지네이션 (`page` 1→0 변환)
- [ ] `getNoticeDetail(Long noticeId)` — `NOTICE_NOT_FOUND(404)` 예외 처리
- [ ] `createNotice(RequestCreate dto, Long adminId)` — `Notice.create(...)` 사용, `@Transactional`
- [ ] `updateNotice(Long noticeId, RequestUpdate dto)` — `notice.update(...)` 사용, `@Transactional`
- [ ] `deleteNotice(Long noticeId)` — `NOTICE_NOT_FOUND(404)` 예외 처리, `@Transactional`

### AdminFaqService

- [ ] `getFaqs(category, page, size)` — 동적 필터 + 페이지네이션
- [ ] `createFaq(RequestCreate dto, Long adminId)` — `Faq.create(...)` 사용, `@Transactional`
- [ ] `updateFaq(Long faqId, RequestUpdate dto)` — `faq.update(...)` 사용, `@Transactional`
- [ ] `deleteFaq(Long faqId)` — `FAQ_NOT_FOUND(404)` 예외 처리, `@Transactional`

### AdminInquiryService

- [ ] `getSummary()` — noticeCount·faqCount·pendingCount·inProgressCount 집계
- [ ] `getInquiries(category, status, keyword, page, size)` — 동적 필터 + keyword(LIKE) + 페이지네이션
- [ ] `getInquiryDetail(Long inquiryId)` — `INQUIRY_NOT_FOUND(404)` 예외 처리, memberName 포함
- [ ] `saveReply(Long inquiryId, String reply, Long adminId)`
  - [ ] `INQUIRY_NOT_FOUND(404)` 예외 처리
  - [ ] `inquiryStatus == COMPLETED` → `INQUIRY_ALREADY_COMPLETED(409)` 예외
  - [ ] `inquiry.saveReply(reply, adminId)` 호출
  - [ ] `@Transactional` 적용
- [ ] `completeInquiry(Long inquiryId, Long adminId)`
  - [ ] `INQUIRY_NOT_FOUND(404)` 예외 처리
  - [ ] `inquiryStatus != IN_PROGRESS` → `INQUIRY_NOT_IN_PROGRESS(400)` 예외
  - [ ] `inquiry.complete()` 호출
  - [ ] `@Transactional` 적용

---

## Phase 4 — Controller & Swagger Docs

- [ ] `AdminCsController.java` — `GET /api/admin/cs/summary`
- [ ] `AdminNoticeController.java`
  - [ ] `GET /api/admin/notices`
  - [ ] `GET /api/admin/notices/{noticeId}`
  - [ ] `POST /api/admin/notices`
  - [ ] `PUT /api/admin/notices/{noticeId}`
  - [ ] `DELETE /api/admin/notices/{noticeId}`
  - [ ] `@AuthenticationPrincipal AdminPrincipal` — 등록 시 adminId 추출
  - [ ] `@PreAuthorize("hasRole('ADMIN')")` 또는 Security Config 적용
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] `AdminFaqController.java`
  - [ ] `GET /api/admin/faqs`
  - [ ] `POST /api/admin/faqs`
  - [ ] `PUT /api/admin/faqs/{faqId}`
  - [ ] `DELETE /api/admin/faqs/{faqId}`
- [ ] `AdminInquiryController.java`
  - [ ] `GET /api/admin/inquiries`
  - [ ] `GET /api/admin/inquiries/{inquiryId}`
  - [ ] `PUT /api/admin/inquiries/{inquiryId}/reply`
  - [ ] `PUT /api/admin/inquiries/{inquiryId}/complete`
  - [ ] `POST /api/admin/ai/notice-draft`
  - [ ] `POST /api/admin/ai/faq-draft`
  - [ ] `POST /api/admin/ai/inquiry-draft`
- [ ] Swagger Docs 분리
  - [ ] `AdminCsControllerDocs.java`
  - [ ] `AdminNoticeControllerDocs.java`
  - [ ] `AdminFaqControllerDocs.java`
  - [ ] `AdminInquiryControllerDocs.java`

---

## Phase 5 — ErrorCode 등록 & 검증

### ErrorCode 추가 (global/exception/ErrorCode)

- [ ] `NOTICE_NOT_FOUND` (404)
- [ ] `FAQ_NOT_FOUND` (404)
- [ ] `INQUIRY_NOT_FOUND` (404)
- [ ] `INQUIRY_ALREADY_COMPLETED` (409)
- [ ] `INQUIRY_NOT_IN_PROGRESS` (400)
- [ ] `AI_SERVER_UNAVAILABLE` (503)

> 기존 도메인(003-member, 004-report)에서 이미 등록된 코드는 재사용한다.
> 중복 등록 금지.

### 검증

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] `page=1` 요청 시 첫 번째 페이지 반환 확인 (1-based → 0-based 변환)
- [ ] `COMPLETED` 문의 답변 저장 시도 → `INQUIRY_ALREADY_COMPLETED(409)` 응답 확인
- [ ] `PENDING` 문의 처리 완료 시도 → `INQUIRY_NOT_IN_PROGRESS(400)` 응답 확인
- [ ] AI 서버 타임아웃 시 → `AI_SERVER_UNAVAILABLE(503)` 응답 확인, CRUD 기능 영향 없음 확인
