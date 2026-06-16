# Plan: 사용자 고객센터 API (User Support)

**Feature Branch**: `feature/user-support-notice-faq` (Phase 1·2·3), `feature/user-support-inquiry` (Phase 4·5)
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## 프로젝트 구조

```text
backend/src/main/java/kr/co/carrer/user/support/
├── repository/
│   ├── UserNoticeRepository.java           # JpaRepository — user 전용 (admin/cs 참조 금지)
│   ├── UserNoticeQueryRepository.java      # Native Query 목록 조회 (동적 필터·페이지네이션)
│   ├── UserFaqQueryRepository.java         # Native Query FAQ 목록 조회
│   └── UserInquiryRepository.java          # JpaRepository — user 전용
├── type/
│   ├── NoticeCategory.java                 # NOTICE, UPDATE, EVENT, MAINTENANCE
│   ├── FaqCategory.java                    # ACCOUNT, PAYMENT, SERVICE, ETC
│   ├── InquiryCategory.java               # REFUND, PAYMENT_ERROR, SERVICE, ACCOUNT, ETC
│   └── InquiryStatus.java                 # PENDING, IN_PROGRESS, COMPLETED
├── service/
│   ├── UserNoticeService.java              # 인터페이스
│   ├── UserFaqService.java
│   ├── UserInquiryService.java
│   └── impl/
│       ├── UserNoticeServiceImpl.java
│       ├── UserFaqServiceImpl.java
│       └── UserInquiryServiceImpl.java
├── controller/
│   ├── UserNoticeController.java           # /api/v1/user/notices
│   ├── UserFaqController.java              # /api/v1/user/faqs
│   └── UserInquiryController.java         # /api/v1/user/inquiries
├── dto/
│   └── SupportDTO.java                     # NoticeList, NoticeDetail, FaqItem, InquiryList, RequestCreateInquiry, ResponseCreateInquiry
├── exception/
│   └── UserSupportErrorCode.java           # NOTICE_NOT_FOUND, UNAUTHORIZED, INVALID_INQUIRY_CONTENT
└── docs/
    ├── UserNoticeControllerDocs.java
    ├── UserFaqControllerDocs.java
    └── UserInquiryControllerDocs.java
```

---

## Entity 공유 전략

현재 notices, faqs, inquiries Entity는 `admin/cs/entity/`에 정의되어 있다.
user/support에서 직접 참조할 수 없으므로 Native Query Repository 방식으로 처리한다.

- `UserNoticeRepository.java`: notices 테이블을 `@Query(nativeQuery=true)` 또는 EntityManager로 직접 접근
- `UserFaqQueryRepository.java`: faqs 테이블 EntityManager 직접 접근
- `UserInquiryRepository.java`: inquiries 테이블 `@Query(nativeQuery=true)` 또는 EntityManager 직접 접근

---

## Phase 1 — DTO 정의

### 작업 목록

1. `SupportDTO.java` 작성 (6종 inner record)
   - `NoticeList(noticeId, category, title, isPinned, viewCount, createdAt)`
   - `NoticeDetail(noticeId, category, title, content, isPinned, viewCount, createdAt, updatedAt, prevNotice, nextNotice)`
   - `NoticeDetail.PrevNext(noticeId, title)`
   - `FaqItem(faqId, category, question, answer, createdAt)`
   - `InquiryList(inquiryId, category, title, contentPreview, reply, inquiryStatus, createdAt)`
   - `RequestCreateInquiry(@NotNull category, @NotBlank @Size(max=200) title, @NotBlank @Size(min=10) content)`
   - `ResponseCreateInquiry(inquiryId, inquiryStatus)`

2. Enum 타입 작성 (user/support/type/ 패키지)
   - NoticeCategory, FaqCategory, InquiryCategory, InquiryStatus

---

## Phase 2 — 레포지토리

### 작업 목록

1. `UserNoticeQueryRepository.java` (Native Query 패턴)
   - `getNoticeList(category, keyword, page, size)` → is_visible=true 필터 포함, is_pinned DESC + created_at DESC
   - `countNotices(category, keyword)` → 페이징 total
   - `getNoticeDetail(Long noticeId)` → is_visible=true 조건 포함
   - `getPrevNotice(Long noticeId)` → 이전 공지 (notice_id < noticeId, is_visible=true)
   - `getNextNotice(Long noticeId)` → 다음 공지 (notice_id > noticeId, is_visible=true)
   - `incrementViewCount(Long noticeId)` → UPDATE notices SET view_count = view_count + 1

2. `UserFaqQueryRepository.java` (Native Query 패턴)
   - `getFaqList(category, keyword)` → question OR answer ILIKE, created_at ASC
   - 페이지네이션 없음

3. `UserInquiryRepository.java` (JpaRepository 또는 Native Query)
   - `findByMemberIdOrderByCreatedAtDesc(UUID memberId)`
   - `findByMemberIdAndCategory(UUID memberId, InquiryCategory category)`

---

## Phase 3 — 서비스 레이어

### 작업 목록

1. `UserNoticeServiceImpl.java`
   - `getNotices(category, keyword, page, size)`:
     - `@Transactional(readOnly = true)`
     - page < 1 또는 size < 1 → BAD_REQUEST(400)
     - size > 100 → clamp to 100
     - page 1-based → 0-based 변환
   - `getNoticeDetail(Long noticeId)`:
     - `@Transactional`
     - is_visible=false 또는 미존재 → NOTICE_NOT_FOUND(404)
     - incrementViewCount(noticeId) 호출
     - prevNotice, nextNotice 조회 후 PrevNext record로 변환 (없으면 null)

2. `UserFaqServiceImpl.java`
   - `getFaqs(category, keyword)`: `@Transactional(readOnly = true)`

3. `UserInquiryServiceImpl.java`
   - `getMyInquiries(UUID memberId, category)`:
     - `@Transactional(readOnly = true)`
     - contentPreview: content 최대 100자 truncate (서비스 레이어에서 처리)
   - `createInquiry(UUID memberId, RequestCreateInquiry dto)`:
     - `@Transactional`
     - content 10자 미만 → INVALID_INQUIRY_CONTENT(400)
     - inquiry_status = PENDING, member_id = memberId로 INSERT

---

## Phase 4 — 컨트롤러

### 작업 목록

1. `UserNoticeController.java`
   - `GET  /api/v1/user/notices?category=&keyword=&page=1&size=20`
   - `GET  /api/v1/user/notices/{noticeId}`

2. `UserFaqController.java`
   - `GET  /api/v1/user/faqs?category=&keyword=`

3. `UserInquiryController.java`
   - `GET  /api/v1/user/inquiries?category=`
   - `POST /api/v1/user/inquiries` (201)

4. SecurityConfig 업데이트
   - `/api/v1/user/notices/**`, `/api/v1/user/faqs/**` → `permitAll()`
   - `/api/v1/user/inquiries/**` → `hasRole('USER')`

5. Docs 인터페이스 3개 작성

---


## 구현 진행 체크리스트

- [ ] Phase 1: DTO 정의 — `SupportDTO.java` inner class 6종
- [ ] Phase 2: Service 구현 — UserNoticeService / UserFaqService / UserInquiryService
- [ ] Phase 3: Controller & Swagger Docs
- [ ] Phase 4: Security 설정 — 공지·FAQ `permitAll()`, 문의 `hasRole('USER')`
- [ ] Phase 5: ErrorCode 등록 & 검증
## Phase 5 — 에러코드 등록 및 검증

### ErrorCode 목록

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| NOTICE_NOT_FOUND | 404 | 공지사항 조회 실패 또는 is_visible=false |
| UNAUTHORIZED | 401 | 문의 목록·접수 미인증 |
| BAD_REQUEST | 400 | page < 1, size < 1 |
| INVALID_INQUIRY_CONTENT | 400 | 문의 content 10자 미만 |

### 검증 체크리스트

- [ ] is_visible=false 공지 목록·상세에서 노출 안 됨 확인
- [ ] is_pinned=true 공지 상단 정렬 확인
- [ ] 공지 상세 조회 시 view_count +1 확인
- [ ] 이전·다음 공지 없는 경우 null 반환 확인
- [ ] FAQ keyword 검색 결과 없음 시 빈 리스트 반환 확인
- [ ] 문의 목록이 본인 문의만 반환 확인
- [ ] 문의 content 10자 미만 시 400 반환 확인
- [ ] 미인증 문의 목록·접수 시 401 반환 확인
- [ ] 모든 응답 ApiResponse<T> 래퍼 확인