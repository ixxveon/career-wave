# Plan: 고객센터 관리 API (Customer Service)

**Feature Branch**: `feature/admin-cs-api`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## 프로젝트 구조

```text
backend/src/main/java/kr/co/carrer/admin/cs/
├── entity/
│   ├── Notice.java                         # notices 테이블 엔티티
│   ├── Faq.java                            # faqs 테이블 엔티티
│   └── Inquiry.java                        # inquiries 테이블 엔티티 (낙관적 락 @Version 포함)
├── repository/
│   ├── NoticeRepository.java               # JpaRepository<Notice, Long>
│   ├── NoticeQueryRepository.java          # Native Query 목록 조회
│   ├── FaqRepository.java                  # JpaRepository<Faq, Long>
│   ├── FaqQueryRepository.java             # Native Query 목록 조회
│   └── InquiryRepository.java             # JpaRepository<Inquiry, Long>
│   └── InquiryQueryRepository.java        # Native Query 목록 조회 + memberName 조인
├── type/
│   ├── NoticeCategory.java                 # NOTICE, UPDATE, EVENT, MAINTENANCE
│   ├── FaqCategory.java                    # ACCOUNT, PAYMENT, SERVICE, ETC
│   ├── InquiryCategory.java               # REFUND, PAYMENT_ERROR, SERVICE, ACCOUNT, ETC
│   └── InquiryStatus.java                 # PENDING, IN_PROGRESS, COMPLETED
├── service/
│   ├── AdminCsService.java                 # KPI 집계 인터페이스
│   ├── AdminNoticeService.java
│   ├── AdminFaqService.java
│   ├── AdminInquiryService.java
│   ├── AdminAiService.java                 # FastAPI 연동 AI 초안 인터페이스
│   └── impl/
│       ├── AdminCsServiceImpl.java
│       ├── AdminNoticeServiceImpl.java
│       ├── AdminFaqServiceImpl.java
│       ├── AdminInquiryServiceImpl.java
│       └── AdminAiServiceImpl.java
├── controller/
│   ├── AdminCsController.java              # GET /api/admin/cs/summary
│   ├── AdminNoticeController.java          # /api/admin/notices
│   ├── AdminFaqController.java             # /api/admin/faqs
│   ├── AdminInquiryController.java        # /api/admin/inquiries
│   └── AdminAiController.java              # /api/admin/ai/...
├── dto/
│   ├── NoticeDTO.java                      # RequestCreate, RequestUpdate, ResponseList, ResponseDetail, ResponseResult
│   ├── FaqDTO.java                         # RequestCreate, RequestUpdate, ResponseList, ResponseResult
│   ├── InquiryDTO.java                    # RequestReply, ResponseList, ResponseDetail, ResponseReply, ResponseComplete
│   ├── CsDTO.java                          # ResponseSummary
│   └── AiDTO.java                          # RequestNoticeDraft, RequestFaqDraft, RequestInquiryDraft, ResponseDraft
├── exception/
│   └── AdminCsErrorCode.java              # NOTICE_NOT_FOUND, FAQ_NOT_FOUND, INQUIRY_NOT_FOUND, 등
└── docs/
    ├── AdminCsControllerDocs.java
    ├── AdminNoticeControllerDocs.java
    ├── AdminFaqControllerDocs.java
    ├── AdminInquiryControllerDocs.java
    └── AdminAiControllerDocs.java
```

---

## Phase 1 — 엔티티 및 Enum

### 작업 목록

1. Enum 타입 작성
   - `NoticeCategory`: NOTICE, UPDATE, EVENT, MAINTENANCE
   - `FaqCategory`: ACCOUNT, PAYMENT, SERVICE, ETC
   - `InquiryCategory`: REFUND, PAYMENT_ERROR, SERVICE, ACCOUNT, ETC
   - `InquiryStatus`: PENDING, IN_PROGRESS, COMPLETED

2. `Notice.java` 엔티티 작성
   - `@Entity @Table(name = "notices")`
   - `@PrePersist`, `@PreUpdate` → createdAt, updatedAt 자동 관리
   - `create(adminId, category, title, content, isVisible)` 팩토리 메서드
   - `update(category, title, content, isVisible)` 비즈니스 메서드

3. `Faq.java` 엔티티 작성
   - `@Entity @Table(name = "faqs")`
   - `create(adminId, category, question, answer)` 팩토리 메서드
   - `update(category, question, answer)` 비즈니스 메서드

4. `Inquiry.java` 엔티티 작성
   - `@Entity @Table(name = "inquiries")`
   - `@Version private Long version` → 낙관적 락
   - `@PrePersist` → inquiryStatus = PENDING 초기화
   - `saveReply(reply, adminId)`: IN_PROGRESS 전이, 최초 repliedAt 설정
   - `complete()`: COMPLETED 전이, completedAt 설정

---

## Phase 2 — 레포지토리

### 작업 목록

1. `NoticeRepository.java` — `JpaRepository<Notice, Long>`

2. `NoticeQueryRepository.java` (Native Query 패턴)
   - `EntityManager` 주입
   - `getNoticeList(category, visible, page, size)` → 동적 필터
   - `countNotices(category, visible)` → 페이징 total

3. `FaqRepository.java` — `JpaRepository<Faq, Long>`

4. `FaqQueryRepository.java` (Native Query 패턴)
   - `getFaqList(category, page, size)` → 동적 필터
   - `countFaqs(category)`

5. `InquiryRepository.java` — `JpaRepository<Inquiry, Long>`
   - `countByInquiryStatus(InquiryStatus status)` 메서드 추가 (KPI용)

6. `InquiryQueryRepository.java` (Native Query 패턴)
   - `getInquiryList(category, status, page, size)` → members 조인으로 memberName 포함
   - `countInquiries(category, status)`

---

## Phase 3 — 서비스 레이어

### 작업 목록

1. `AdminCsServiceImpl.java`
   - `getSummary()`: `@Transactional(readOnly = true)`
   - notice/faq/inquiry count 집계 → CsDTO.ResponseSummary 반환

2. `AdminNoticeServiceImpl.java`
   - `getNotices()`: `@Transactional(readOnly = true)`, page 1-based → 0-based
   - `getNoticeDetail()`: `@Transactional(readOnly = true)`, NOTICE_NOT_FOUND(404)
   - `createNotice()`: `@Transactional`, Notice.create() 팩토리 사용
   - `updateNotice()`: `@Transactional`, notice.update() 호출
   - `deleteNotice()`: `@Transactional`, NOTICE_NOT_FOUND(404)

3. `AdminFaqServiceImpl.java`
   - CRUD 패턴 동일 (NOTICE와 동일 구조)

4. `AdminInquiryServiceImpl.java`
   - `getInquiries()`: `@Transactional(readOnly = true)`
   - `getInquiryDetail()`: `@Transactional(readOnly = true)`, INQUIRY_NOT_FOUND(404)
   - `saveReply()`:
     - `@Transactional`
     - INQUIRY_NOT_FOUND(404)
     - COMPLETED → INQUIRY_ALREADY_COMPLETED(409)
     - inquiry.saveReply(reply, adminId) 호출
     - ObjectOptimisticLockingFailureException → INQUIRY_CONFLICT(409) 처리
   - `completeInquiry()`:
     - `@Transactional`
     - INQUIRY_NOT_FOUND(404)
     - IN_PROGRESS 아님 → INQUIRY_NOT_IN_PROGRESS(400)
     - inquiry.complete() 호출

5. `AdminAiServiceImpl.java`
   - RestTemplate 또는 WebClient로 FastAPI 내부 호출
   - 타임아웃 10초 설정
   - 타임아웃/연결 실패 → AI_SERVER_UNAVAILABLE(503) throw
   - `generateNoticeDraft()`, `generateFaqDraft()`, `generateInquiryDraft()` 구현

---

## Phase 4 — 컨트롤러

### 작업 목록

1. `AdminCsController.java` — `GET /api/admin/cs/summary`
2. `AdminNoticeController.java`
   - `GET    /api/admin/notices`
   - `GET    /api/admin/notices/{noticeId}`
   - `POST   /api/admin/notices` (201)
   - `PUT    /api/admin/notices/{noticeId}`
   - `DELETE /api/admin/notices/{noticeId}`
3. `AdminFaqController.java`
   - `GET    /api/admin/faqs`
   - `POST   /api/admin/faqs` (201)
   - `PUT    /api/admin/faqs/{faqId}`
   - `DELETE /api/admin/faqs/{faqId}`
4. `AdminInquiryController.java`
   - `GET /api/admin/inquiries`
   - `GET /api/admin/inquiries/{inquiryId}`
   - `PUT /api/admin/inquiries/{inquiryId}/reply`
   - `PUT /api/admin/inquiries/{inquiryId}/complete`
5. `AdminAiController.java`
   - `POST /api/admin/ai/notice-draft`
   - `POST /api/admin/ai/faq-draft`
   - `POST /api/admin/ai/inquiry-draft`
6. 각 Docs 인터페이스 작성 (Swagger)

---

## Phase 5 — 에러코드 등록 및 검증

### ErrorCode 목록

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| NOTICE_NOT_FOUND | 404 | 공지사항 조회·수정·삭제 실패 |
| FAQ_NOT_FOUND | 404 | FAQ 조회·수정·삭제 실패 |
| INQUIRY_NOT_FOUND | 404 | 문의 조회·답변·완료 처리 실패 |
| INQUIRY_ALREADY_COMPLETED | 409 | COMPLETED 문의 답변 수정 시도 |
| INQUIRY_NOT_IN_PROGRESS | 400 | IN_PROGRESS 아닌 문의 완료 처리 시도 |
| INQUIRY_CONFLICT | 409 | 낙관적 락 충돌 |
| AI_SERVER_UNAVAILABLE | 503 | FastAPI 타임아웃 또는 연결 실패 |

### 검증 체크리스트

- [ ] COMPLETED 문의 답변 수정 시도 시 409 반환
- [ ] IN_PROGRESS 아닌 문의 완료 처리 시도 시 400 반환
- [ ] 낙관적 락 충돌 시 409 INQUIRY_CONFLICT 반환
- [ ] repliedAt 최초 답변 시에만 설정, 이후 수정 시 미갱신 확인
- [ ] FastAPI 타임아웃 시 503 반환
- [ ] 공지사항·FAQ 삭제 응답 ApiResponse<Void>(data: null) 확인
- [ ] 모든 응답 ApiResponse<T> 래퍼 확인