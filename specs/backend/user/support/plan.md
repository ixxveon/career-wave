# Plan: 사용자 고객센터 API (User Support)

**Feature Branch**: `feature/user-support-notice-faq` (Phase 1·2·3), `feature/user-support-inquiry` (Phase 4·5)
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## Summary

회원이 공지사항·FAQ를 조회하고 1:1 문의를 접수·확인하는 사용자 고객센터 REST API.
notices, faqs, inquiries 테이블은 admin/cs와 공유하며, user/support는 조회·접수 전용.

---

## Technical Context

- Spring Boot + JPA 기반 사용자 백엔드
- 패키지: `user/support/`
- 연관 테이블: `notices`, `faqs`, `inquiries`
- `admin/cs/` 직접 참조 금지 (CONVENTION.md) — user 전용 Repository로 분리

---

## Entity 공유 전략

notices, faqs, inquiries Entity는 `admin/cs/entity/`에 정의되어 있음.
user/support에서 직접 참조 불가 → Native Query Repository 방식으로 테이블 직접 접근.

---

## Project Structure

```text
user/support/
├── repository/
│   ├── UserNoticeRepository.java
│   ├── UserNoticeQueryRepository.java
│   ├── UserFaqQueryRepository.java
│   └── UserInquiryRepository.java
├── type/
│   ├── NoticeCategory.java            -- NOTICE / UPDATE / EVENT / MAINTENANCE
│   ├── FaqCategory.java               -- ACCOUNT / PAYMENT / SERVICE / ETC
│   ├── InquiryCategory.java          -- REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC
│   └── InquiryStatus.java            -- PENDING / IN_PROGRESS / COMPLETED
├── service/
│   ├── UserNoticeService.java
│   ├── UserFaqService.java
│   ├── UserInquiryService.java
│   └── impl/
│       ├── UserNoticeServiceImpl.java
│       ├── UserFaqServiceImpl.java
│       └── UserInquiryServiceImpl.java
├── controller/
│   ├── UserNoticeController.java
│   ├── UserFaqController.java
│   └── UserInquiryController.java
├── dto/
│   └── SupportDTO.java
├── exception/
│   └── UserSupportErrorCode.java
└── docs/
    ├── UserNoticeControllerDocs.java
    ├── UserFaqControllerDocs.java
    └── UserInquiryControllerDocs.java
```

---

## Phases

- [ ] Phase 1: DTO 정의
  - `SupportDTO.java` inner record 6종 작성
  - `NoticeList`, `NoticeDetail(PrevNext 포함)`, `FaqItem`, `InquiryList`, `RequestCreateInquiry`, `ResponseCreateInquiry`
  - `NoticeCategory`, `FaqCategory`, `InquiryCategory`, `InquiryStatus` Enum 작성

- [ ] Phase 2: 레포지토리
  - `UserNoticeQueryRepository.java` — Native Query, is_visible=true 필터, is_pinned DESC + created_at DESC 정렬, `getPrevNotice()` / `getNextNotice()`, `incrementViewCount()`
  - `UserFaqQueryRepository.java` — Native Query, question OR answer ILIKE, created_at ASC
  - `UserInquiryRepository.java` — member_id 기준 본인 조회

- [ ] Phase 3: 서비스 레이어
  - `getNotices()` — `@Transactional(readOnly = true)`, page < 1 → BAD_REQUEST(400), size > 100 → BAD_REQUEST(400)
  - `getNoticeDetail()` — `@Transactional`, is_visible=false → NOTICE_NOT_FOUND(404), view_count +1, prevNotice/nextNotice 조회
  - `getFaqs()` — `@Transactional(readOnly = true)`
  - `getMyInquiries()` — `@Transactional(readOnly = true)`, contentPreview 100자 truncate
  - `createInquiry()` — `@Transactional`, content 10자 미만 → INVALID_INQUIRY_CONTENT(400), inquiry_status=PENDING

- [ ] Phase 4: 컨트롤러 & Security 설정
  - `UserNoticeController` — `GET /api/v1/user/notices`, `GET /api/v1/user/notices/{noticeId}`
  - `UserFaqController` — `GET /api/v1/user/faqs`
  - `UserInquiryController` — `GET /api/v1/user/inquiries`, `POST /api/v1/user/inquiries` (201)
  - SecurityConfig — 공지·FAQ `permitAll()`, 문의 `hasRole('USER')`
  - Docs 인터페이스 3개 작성

- [ ] Phase 5: 검증
  - is_visible=false 공지 목록·상세 미노출 확인
  - is_pinned=true 공지 상단 정렬 확인
  - 공지 상세 조회 시 view_count +1 확인
  - 이전·다음 공지 없을 때 null 반환 확인
  - 문의 목록 본인 문의만 반환 확인
  - 미인증 문의 목록·접수 시 401 반환 확인
  - 모든 응답 ApiResponse<T> 래퍼 확인