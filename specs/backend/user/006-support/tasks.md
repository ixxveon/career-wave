# Tasks: 사용자 고객센터 API (User Support)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — DTO 정의

- [ ] `SupportDTO.java`
  - [ ] `NoticeList` — noticeId / category / title / isPinned / viewCount / createdAt
  - [ ] `NoticeDetail` — NoticeList 필드 + content / updatedAt / prevNotice / nextNotice
    - [ ] `PrevNext` 중첩 record — noticeId / title
  - [ ] `FaqItem` — faqId / category / question / answer / createdAt
  - [ ] `InquiryList` — inquiryId / category / title / content / reply / inquiryStatus / createdAt
  - [ ] `RequestCreateInquiry` — `@NotNull` category / `@NotBlank @Size(max=200)` title / `@NotBlank @Size(min=10)` content
  - [ ] `ResponseCreateInquiry` — inquiryId / inquiryStatus

---

## Phase 2 — Service 구현

### UserNoticeService

- [ ] `getNotices(category, keyword, page, size)`
  - [ ] `is_visible = true` 조건 필수
  - [ ] `is_pinned DESC, created_at DESC` 정렬
  - [ ] `keyword` → `title LIKE %keyword%`
  - [ ] page 1-based → 0-based 변환
  - [ ] 반환: `PaginationResponse<SupportDTO.NoticeList>`

- [ ] `getNoticeDetail(Long noticeId)`
  - [ ] `is_visible = false` 또는 존재하지 않으면 `NOTICE_NOT_FOUND(404)`
  - [ ] `view_count + 1` UPDATE — `@Transactional`
  - [ ] 이전·다음 공지 조회: `is_visible = true` 조건에서 `notice_id` 인접 건
  - [ ] 반환: `SupportDTO.NoticeDetail`

### UserFaqService

- [ ] `getFaqs(category, keyword)`
  - [ ] `category` null이면 전체
  - [ ] `keyword` → `question LIKE %keyword%` OR `answer LIKE %keyword%`
  - [ ] `created_at ASC` 정렬
  - [ ] 반환: `List<SupportDTO.FaqItem>`

### UserInquiryService

- [ ] `getMyInquiries(UUID memberId, category)`
  - [ ] `member_id = memberId` 필터 필수 (타인 조회 차단)
  - [ ] `category` null이면 전체
  - [ ] `created_at DESC` 정렬
  - [ ] 반환: `List<SupportDTO.InquiryList>`

- [ ] `createInquiry(UUID memberId, RequestCreateInquiry dto)`
  - [ ] `inquiry_status = PENDING` 고정
  - [ ] `member_id = memberId` 설정
  - [ ] `@Transactional` 적용
  - [ ] 반환: `SupportDTO.ResponseCreateInquiry`

---

## Phase 3 — Controller & Swagger Docs

- [ ] `UserNoticeController.java`
  - [ ] `GET /api/notices`
  - [ ] `GET /api/notices/{noticeId}`
  - [ ] `@Min(1)` / `@Max(100)` 페이지 파라미터 검증
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] `UserFaqController.java`
  - [ ] `GET /api/faqs`
- [ ] `UserInquiryController.java`
  - [ ] `GET /api/inquiries`
  - [ ] `POST /api/inquiries` → 201 Created
  - [ ] `@AuthenticationPrincipal UserPrincipal` — memberId 추출
- [ ] Swagger Docs 분리
  - [ ] `UserNoticeControllerDocs.java`
  - [ ] `UserFaqControllerDocs.java`
  - [ ] `UserInquiryControllerDocs.java`

---

## Phase 4 — Security 설정

- [ ] `GET /api/notices/**` → `permitAll()`
- [ ] `GET /api/faqs/**` → `permitAll()`
- [ ] `GET /api/inquiries` → `hasRole('USER')`
- [ ] `POST /api/inquiries` → `hasRole('USER')`

---

## Phase 5 — ErrorCode 등록 & 검증

### ErrorCode 추가

- [ ] `NOTICE_NOT_FOUND` (404) — admin/cs `ErrorCode`에 이미 등록된 경우 반드시 재사용. 중복 선언 금지.
- [ ] `INVALID_INQUIRY_CONTENT` (400) — `@Size(min=10)` 위반 시

### 검증

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] `is_visible=false` 공지 상세 조회 시 404 반환 확인
- [ ] 공지 상세 조회 시 `view_count`가 1 증가하는지 확인
- [ ] `is_pinned=true` 공지가 목록 상단에 정렬되는지 확인
- [ ] 타인 member_id로 문의 목록 조회 시 본인 건만 반환 확인
- [ ] 미인증 상태에서 문의 API 호출 시 401 반환 확인
- [ ] 문의 내용 10자 미만 접수 시 400 반환 확인
- [ ] `admin/cs/` 패키지 직접 참조가 없는지 확인
