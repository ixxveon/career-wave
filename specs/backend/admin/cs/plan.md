# Plan: 고객센터 관리 API (Customer Service)

**Feature Branch**: `feature/admin-cs-api`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## Summary

공지사항·FAQ CRUD와 1:1 문의 답변·완료 처리 어드민 REST API.
KPI 집계 및 AI 초안 생성(FastAPI 연동) 포함.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/cs/`
- 연관 테이블: `notices`, `faqs`, `inquiries`
- AI 연동: Spring → FastAPI 내부 호출 (RestTemplate 또는 WebClient), 타임아웃 10초

---

## Project Structure

```text
admin/cs/
├── entity/
│   ├── Notice.java
│   ├── Faq.java
│   └── Inquiry.java                   -- @Version 낙관적 락 포함
├── repository/
│   ├── NoticeRepository.java
│   ├── NoticeQueryRepository.java
│   ├── FaqRepository.java
│   ├── FaqQueryRepository.java
│   ├── InquiryRepository.java
│   └── InquiryQueryRepository.java
├── type/
│   ├── NoticeCategory.java            -- NOTICE / UPDATE / EVENT / MAINTENANCE
│   ├── FaqCategory.java               -- ACCOUNT / PAYMENT / SERVICE / ETC
│   ├── InquiryCategory.java          -- REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC
│   └── InquiryStatus.java            -- PENDING / IN_PROGRESS / COMPLETED
├── service/
│   ├── AdminCsService.java
│   ├── AdminNoticeService.java
│   ├── AdminFaqService.java
│   ├── AdminInquiryService.java
│   ├── AdminAiService.java
│   └── impl/
│       ├── AdminCsServiceImpl.java
│       ├── AdminNoticeServiceImpl.java
│       ├── AdminFaqServiceImpl.java
│       ├── AdminInquiryServiceImpl.java
│       └── AdminAiServiceImpl.java
├── controller/
│   ├── AdminCsController.java
│   ├── AdminNoticeController.java
│   ├── AdminFaqController.java
│   ├── AdminInquiryController.java
│   └── AdminAiController.java
├── dto/
│   ├── NoticeDTO.java
│   ├── FaqDTO.java
│   ├── InquiryDTO.java
│   ├── CsDTO.java
│   └── AiDTO.java
├── exception/
│   └── AdminCsErrorCode.java
└── docs/
    ├── AdminCsControllerDocs.java
    ├── AdminNoticeControllerDocs.java
    ├── AdminFaqControllerDocs.java
    ├── AdminInquiryControllerDocs.java
    └── AdminAiControllerDocs.java
```

---

## Phases

- [ ] Phase 1: 엔티티 및 Enum
  - `NoticeCategory`, `FaqCategory`, `InquiryCategory`, `InquiryStatus` Enum 작성
  - `Notice.java` — `@PrePersist/@PreUpdate`, `create()` 팩토리, `update()` 비즈니스 메서드
  - `Faq.java` — `create()` / `update()` 비즈니스 메서드
  - `Inquiry.java` — `@Version` 낙관적 락, `saveReply()` / `complete()` 비즈니스 메서드

- [ ] Phase 2: 레포지토리
  - `NoticeRepository` / `FaqRepository` / `InquiryRepository` — `JpaRepository`
  - `InquiryRepository.countByInquiryStatus()` — KPI 집계용
  - `NoticeQueryRepository` / `FaqQueryRepository` / `InquiryQueryRepository` — Native Query 동적 필터

- [ ] Phase 3: 서비스 레이어
  - `AdminCsServiceImpl.getSummary()` — `@Transactional(readOnly = true)`, 3개 테이블 count 집계
  - Notice CRUD — `@Transactional(readOnly = true)` / `@Transactional`, NOTICE_NOT_FOUND(404)
  - FAQ CRUD — Notice와 동일 구조
  - `saveReply()` — `@Transactional`, COMPLETED → INQUIRY_ALREADY_COMPLETED(409), 낙관적 락 충돌 → INQUIRY_CONFLICT(409)
  - `completeInquiry()` — `@Transactional`, IN_PROGRESS 아님 → INQUIRY_NOT_IN_PROGRESS(400)
  - `AdminAiServiceImpl` — FastAPI 내부 호출, 10초 타임아웃 → AI_SERVER_UNAVAILABLE(503)
  - `AdminCsErrorCode.java` 작성

- [ ] Phase 4: 컨트롤러
  - `AdminCsController` — `GET /api/v1/admin/cs/summary`
  - `AdminNoticeController` — 공지사항 CRUD 5개 엔드포인트
  - `AdminFaqController` — FAQ CRUD 4개 엔드포인트
  - `AdminInquiryController` — 문의 조회·답변·완료 4개 엔드포인트
  - `AdminAiController` — AI 초안 3개 엔드포인트
  - Docs 인터페이스 5개 작성

- [ ] Phase 5: 검증
  - COMPLETED 문의 답변 수정 시 409 반환 확인
  - IN_PROGRESS 아닌 문의 완료 처리 시 400 반환 확인
  - 낙관적 락 충돌 시 409 INQUIRY_CONFLICT 반환 확인
  - repliedAt 최초 답변 시에만 설정 확인
  - FastAPI 타임아웃 시 503 반환 확인
  - 모든 응답 ApiResponse<T> 래퍼 확인