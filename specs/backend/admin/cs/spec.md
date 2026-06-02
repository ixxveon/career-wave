# Spec: 고객센터 관리 API (Customer Service)

**Feature Branch**: `feature/admin-cs-api`
**버전**: v1
**Status**: 스펙 완료
**담당**: 신보라

---

## 도메인 개요

공지사항·FAQ CRUD와 1:1 문의 답변 처리 어드민 REST API.
AI 초안 생성은 Spring → FastAPI 내부 호출 방식으로 처리하며, 외부에 직접 노출하지 않는다.

- 공지사항·FAQ: 어드민이 직접 등록·수정·삭제 (회원 노출 여부 제어 포함)
- 1:1 문의: 회원 앱에서 접수, 어드민은 조회·답변·완료 처리만 담당
- 환불 카테고리 문의: CS에서 접수 확인 후 결제·정산 페이지에서 실제 환불 처리 (CS API 범위 외)

---

## ERD

### notices

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `notice_id` | BIGSERIAL | PK | 공지 고유 식별자 |
| `admin_id` | BIGINT | FK → admins(admin_id), NOT NULL | 작성 관리자 |
| `category` | VARCHAR(20) | NOT NULL, CHECK IN ('NOTICE','UPDATE','EVENT','MAINTENANCE') | 공지 카테고리 |
| `title` | VARCHAR(200) | NOT NULL | 제목 |
| `content` | TEXT | NULL | 내용 |
| `is_visible` | BOOLEAN | NOT NULL DEFAULT true | 노출 여부 |
| `is_pinned` | BOOLEAN | NOT NULL DEFAULT false | 공지 고정 여부 (User 목록 상단 고정) |
| `view_count` | INT | NOT NULL DEFAULT 0 | 조회수 (User 상세 페이지 조회 시 증가) |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 수정 시각 |

### faqs

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `faq_id` | BIGSERIAL | PK | FAQ 고유 식별자 |
| `admin_id` | BIGINT | FK → admins(admin_id), NOT NULL | 작성 관리자 |
| `category` | VARCHAR(20) | NOT NULL, CHECK IN ('ACCOUNT','PAYMENT','SERVICE','ETC') | FAQ 카테고리 |
| `question` | VARCHAR(500) | NOT NULL | 질문 |
| `answer` | TEXT | NULL | 답변 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 수정 시각 |

### inquiries

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `inquiry_id` | BIGSERIAL | PK | 문의 고유 식별자 |
| `member_id` | UUID | FK → members(member_id), NOT NULL | 문의 회원 |
| `admin_id` | BIGINT | FK → admins(admin_id), NULL | 담당 관리자 (PENDING 시 NULL 허용) |
| `category` | VARCHAR(20) | NOT NULL, CHECK IN ('REFUND','PAYMENT_ERROR','SERVICE','ACCOUNT','ETC') | 문의 카테고리 |
| `title` | VARCHAR(200) | NOT NULL | 문의 제목 |
| `content` | TEXT | NOT NULL | 문의 내용 |
| `reply` | TEXT | NULL | 관리자 답변 |
| `inquiry_status` | VARCHAR(20) | NOT NULL DEFAULT 'PENDING', CHECK IN ('PENDING','IN_PROGRESS','COMPLETED') | 처리 상태 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 접수 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | 수정 시각 |
| `replied_at` | TIMESTAMPTZ | NULL | 최초 답변 시각 |
| `completed_at` | TIMESTAMPTZ | NULL | 처리 완료 시각 |

**인덱스**:
```sql
CREATE INDEX idx_inquiries_status   ON inquiries(inquiry_status);
CREATE INDEX idx_inquiries_category ON inquiries(category);
CREATE INDEX idx_inquiries_member   ON inquiries(member_id);
```

**제약**:
```sql
CONSTRAINT chk_replied_at   CHECK (inquiry_status = 'PENDING' OR replied_at IS NOT NULL)
CONSTRAINT chk_completed_at CHECK (inquiry_status != 'COMPLETED' OR completed_at IS NOT NULL)
```

---

## 패키지 구조

```text
admin/cs/
├── entity/
│   ├── Notice.java
│   ├── Faq.java
│   └── Inquiry.java
├── repository/
│   ├── NoticeRepository.java
│   ├── FaqRepository.java
│   └── InquiryRepository.java
├── type/
│   ├── NoticeCategory.java      — NOTICE / UPDATE / EVENT / MAINTENANCE
│   ├── FaqCategory.java         — ACCOUNT / PAYMENT / SERVICE / ETC
│   ├── InquiryCategory.java     — REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC
│   └── InquiryStatus.java       — PENDING / IN_PROGRESS / COMPLETED
├── service/
│   ├── AdminNoticeService.java
│   ├── AdminFaqService.java
│   └── AdminInquiryService.java
├── controller/
│   ├── AdminCsController.java      — GET /api/admin/cs/summary
│   ├── AdminNoticeController.java  — /api/admin/notices
│   ├── AdminFaqController.java     — /api/admin/faqs
│   └── AdminInquiryController.java — /api/admin/inquiries + AI 초안
├── dto/
│   ├── NoticeDTO.java
│   ├── FaqDTO.java
│   └── InquiryDTO.java
└── docs/
    ├── AdminCsControllerDocs.java
    ├── AdminNoticeControllerDocs.java
    ├── AdminFaqControllerDocs.java
    └── AdminInquiryControllerDocs.java
```

> `user/` 패키지 클래스를 직접 참조하지 않는다. (CONVENTION.md — admin과 user는 서로 직접 참조 금지)

---

## Entity

### Notice.java

```java
@Entity
@Table(name = "notices")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notice_id")
    private Long noticeId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private NoticeCategory category;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_visible", nullable = false)
    private boolean isVisible;

    @Column(name = "is_pinned", nullable = false)
    private boolean isPinned;

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = ZonedDateTime.now();
    }

    // 등록
    public static Notice create(Long adminId, NoticeCategory category,
                                 String title, String content, boolean isVisible) {
        Notice notice = new Notice();
        notice.adminId = adminId;
        notice.category = category;
        notice.title = title;
        notice.content = content;
        notice.isVisible = isVisible;
        return notice;
    }

    // 수정
    public void update(NoticeCategory category, String title,
                        String content, boolean isVisible) {
        this.category = category;
        this.title = title;
        this.content = content;
        this.isVisible = isVisible;
    }
}
```

### Faq.java

```java
@Entity
@Table(name = "faqs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Faq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "faq_id")
    private Long faqId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private FaqCategory category;

    @Column(name = "question", nullable = false, length = 500)
    private String question;

    @Column(name = "answer", columnDefinition = "TEXT")
    private String answer;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    private void prePersist() {
        this.createdAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }

    @PreUpdate
    private void preUpdate() {
        this.updatedAt = ZonedDateTime.now();
    }

    public static Faq create(Long adminId, FaqCategory category,
                              String question, String answer) {
        Faq faq = new Faq();
        faq.adminId = adminId;
        faq.category = category;
        faq.question = question;
        faq.answer = answer;
        return faq;
    }

    public void update(FaqCategory category, String question, String answer) {
        this.category = category;
        this.question = question;
        this.answer = answer;
    }
}
```

### Inquiry.java

```java
@Entity
@Table(name = "inquiries")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inquiry_id")
    private Long inquiryId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "admin_id")
    private Long adminId;                   // PENDING 시 NULL 허용

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    private InquiryCategory category;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "reply", columnDefinition = "TEXT")
    private String reply;

    @Enumerated(EnumType.STRING)
    @Column(name = "inquiry_status", nullable = false, length = 20)
    private InquiryStatus inquiryStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @Column(name = "replied_at")
    private ZonedDateTime repliedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @PrePersist
    private void prePersist() {
        this.inquiryStatus = InquiryStatus.PENDING;
        this.createdAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }

    // 답변 저장 (PENDING/IN_PROGRESS → IN_PROGRESS 전이)
    // 호출 전 Service에서 COMPLETED 상태를 검증하여 차단한다.
    public void saveReply(String reply, Long adminId) {
        this.reply = reply;
        this.adminId = adminId;
        this.inquiryStatus = InquiryStatus.IN_PROGRESS;
        if (this.repliedAt == null) {
            this.repliedAt = ZonedDateTime.now();
        }
        this.updatedAt = ZonedDateTime.now();
    }

    // 처리 완료 (IN_PROGRESS → COMPLETED 전이)
    // 호출 전 Service에서 IN_PROGRESS 여부를 검증한다.
    public void complete() {
        this.inquiryStatus = InquiryStatus.COMPLETED;
        this.completedAt = ZonedDateTime.now();
        this.updatedAt = ZonedDateTime.now();
    }
}
```

---

## DTO 구조

### PaginationResponse.java

```java
// common/dto/ 패키지에 공통 배치
public record PaginationResponse<T>(
    List<T> items,
    int page,          // 1-based (요청값 그대로 반환)
    int size,
    long totalItems,
    int totalPages
) {}
```

> Spring 기본 `Page<T>` 객체를 직접 반환하지 않는다.
> Service에서 `Page` 결과를 `PaginationResponse`로 변환하여 반환한다.

---

### NoticeDTO.java

```java
public class NoticeDTO {

    // 공지사항 등록 요청
    public record RequestCreate(
        @NotNull NoticeCategory category,
        @NotBlank @Size(max = 200) String title,
        String content,
        boolean isVisible
    ) {}

    // 공지사항 수정 요청
    public record RequestUpdate(
        @NotNull NoticeCategory category,
        @NotBlank @Size(max = 200) String title,
        String content,
        boolean isVisible
    ) {}

    // 목록 항목
    public record ResponseList(
        Long noticeId,
        NoticeCategory category,
        String title,
        boolean isVisible,
        ZonedDateTime createdAt
    ) {}

    // 단건 상세
    public record ResponseDetail(
        Long noticeId,
        NoticeCategory category,
        String title,
        String content,
        boolean isVisible,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
    ) {}

    // 등록·수정 결과
    public record ResponseResult(
        Long noticeId,
        ZonedDateTime updatedAt   // 등록 시 null, 수정 시 설정
    ) {}
}
```

### FaqDTO.java

```java
public class FaqDTO {

    public record RequestCreate(
        @NotNull FaqCategory category,
        @NotBlank @Size(max = 500) String question,
        String answer
    ) {}

    public record RequestUpdate(
        @NotNull FaqCategory category,
        @NotBlank @Size(max = 500) String question,
        String answer
    ) {}

    public record ResponseList(
        Long faqId,
        FaqCategory category,
        String question,
        ZonedDateTime createdAt
    ) {}

    public record ResponseResult(
        Long faqId,
        ZonedDateTime updatedAt
    ) {}
}
```

### InquiryDTO.java

```java
public class InquiryDTO {

    // 답변 저장 요청
    public record RequestReply(
        @NotBlank String reply
    ) {}

    // 목록 항목
    public record ResponseList(
        Long inquiryId,
        String memberName,
        InquiryCategory category,
        String title,
        InquiryStatus inquiryStatus,
        ZonedDateTime createdAt
    ) {}

    // 상세 조회
    public record ResponseDetail(
        Long inquiryId,
        String memberName,
        InquiryCategory category,
        String title,
        String content,
        String reply,
        InquiryStatus inquiryStatus,
        ZonedDateTime createdAt,
        ZonedDateTime repliedAt,
        ZonedDateTime completedAt
    ) {}

    // 답변 저장 결과
    public record ResponseReply(
        Long inquiryId,
        InquiryStatus inquiryStatus,
        ZonedDateTime repliedAt
    ) {}

    // 처리 완료 결과
    public record ResponseComplete(
        Long inquiryId,
        InquiryStatus inquiryStatus,
        ZonedDateTime completedAt
    ) {}
}
```

### CsDTO.java

```java
// KPI 집계는 공지·FAQ·문의 3개 도메인에 걸친 크로스 도메인 DTO
public class CsDTO {

    // KPI 집계 응답
    public record ResponseSummary(
        long noticeCount,
        long faqCount,
        long pendingCount,
        long inProgressCount
    ) {}
}
```

### AiDTO.java

```java
// AI 초안 생성 요청·응답 (공지·FAQ·문의 공통)
public class AiDTO {

    // 공지 초안 요청
    public record RequestNoticeDraft(
        @NotNull NoticeCategory category,
        @NotBlank String title
    ) {}

    // FAQ 초안 요청
    public record RequestFaqDraft(
        @NotBlank String question
    ) {}

    // 문의 초안 요청
    public record RequestInquiryDraft(
        @NotNull InquiryCategory category,
        @NotBlank String title,
        @NotBlank String content
    ) {}

    // AI 초안 응답 (공지·FAQ·문의 공통)
    public record ResponseDraft(
        String draft
    ) {}
}
```

---

## API 명세

### KPI 집계

```http
GET /api/admin/cs/summary
응답: ApiResponse<CsDTO.ResponseSummary>
```

### 공지사항

```http
GET    /api/admin/notices?category=&visible=&page=&size=
         → ApiResponse<PaginationResponse<NoticeDTO.ResponseList>>

GET    /api/admin/notices/{noticeId}
         → ApiResponse<NoticeDTO.ResponseDetail>

POST   /api/admin/notices
         Body: NoticeDTO.RequestCreate
         → ApiResponse<NoticeDTO.ResponseResult>  (201)

PUT    /api/admin/notices/{noticeId}
         Body: NoticeDTO.RequestUpdate
         → ApiResponse<NoticeDTO.ResponseResult>

DELETE /api/admin/notices/{noticeId}
         → ApiResponse<Void>  (200, data: null)
```

### FAQ

```http
GET    /api/admin/faqs?category=&page=&size=
         → ApiResponse<PaginationResponse<FaqDTO.ResponseList>>

POST   /api/admin/faqs
         Body: FaqDTO.RequestCreate
         → ApiResponse<FaqDTO.ResponseResult>  (201)

PUT    /api/admin/faqs/{faqId}
         Body: FaqDTO.RequestUpdate
         → ApiResponse<FaqDTO.ResponseResult>

DELETE /api/admin/faqs/{faqId}
         → ApiResponse<Void>  (200, data: null)
```

### 1:1 문의

```http
GET    /api/admin/inquiries?category=&status=&page=&size=
         → ApiResponse<PaginationResponse<InquiryDTO.ResponseList>>

GET    /api/admin/inquiries/{inquiryId}
         → ApiResponse<InquiryDTO.ResponseDetail>

PUT    /api/admin/inquiries/{inquiryId}/reply
         Body: InquiryDTO.RequestReply
         → ApiResponse<InquiryDTO.ResponseReply>

PUT    /api/admin/inquiries/{inquiryId}/complete
         → ApiResponse<InquiryDTO.ResponseComplete>
```

### AI 초안 (FastAPI 연동)

```http
POST   /api/admin/ai/notice-draft
         Body: AiDTO.RequestNoticeDraft  (category, title)
         → ApiResponse<AiDTO.ResponseDraft>

POST   /api/admin/ai/faq-draft
         Body: AiDTO.RequestFaqDraft  (question)
         → ApiResponse<AiDTO.ResponseDraft>

POST   /api/admin/ai/inquiry-draft
         Body: AiDTO.RequestInquiryDraft  (category, title, content)
         → ApiResponse<AiDTO.ResponseDraft>
```

> AI 엔드포인트는 Spring → FastAPI 내부 호출 방식 (RestTemplate 또는 WebClient 사용).
> FastAPI 타임아웃 10초 초과 시 `AI_SERVER_UNAVAILABLE(503)` 반환.

---

## 서비스 로직

### AdminNoticeService

#### getNotices(category, visible, page, size)
- 동적 필터 (`category`, `visible` null이면 미적용)
- `page` 1-based → `page - 1` 변환 후 Pageable 전달
- 기본 정렬: `createdAt DESC`
- 반환: `items(ResponseList)`, `page`, `size`, `totalItems`, `totalPages`

#### getNoticeDetail(Long noticeId)
- `NOTICE_NOT_FOUND(404)` 예외 처리

#### createNotice(RequestCreate dto, Long adminId)
- `Notice.create(...)` 팩토리 메서드 사용
- `@Transactional` 적용
- 반환: `ResponseResult(noticeId, null)`

#### updateNotice(Long noticeId, RequestUpdate dto)
- `NOTICE_NOT_FOUND(404)` 예외 처리
- `notice.update(...)` 비즈니스 메서드 호출
- `@Transactional` 적용
- 반환: `ResponseResult(noticeId, updatedAt)`

#### deleteNotice(Long noticeId)
- `NOTICE_NOT_FOUND(404)` 예외 처리
- `@Transactional` 적용

---

### AdminFaqService

#### getFaqs(category, page, size)
- 동적 필터, page 1-based → 0-based 변환

#### createFaq(RequestCreate dto, Long adminId)
- `Faq.create(...)` 팩토리 메서드 사용
- `@Transactional` 적용

#### updateFaq(Long faqId, RequestUpdate dto)
- `FAQ_NOT_FOUND(404)` 예외 처리
- `faq.update(...)` 비즈니스 메서드 호출
- `@Transactional` 적용

#### deleteFaq(Long faqId)
- `FAQ_NOT_FOUND(404)` 예외 처리
- `@Transactional` 적용

---

### AdminCsService

#### getSummary()
- `noticeRepository.count()` → `noticeCount`
- `faqRepository.count()` → `faqCount`
- `inquiryRepository.countByInquiryStatus(PENDING)` → `pendingCount`
- `inquiryRepository.countByInquiryStatus(IN_PROGRESS)` → `inProgressCount`
- 반환: `CsDTO.ResponseSummary`

---

### AdminAiService

#### generateNoticeDraft(AiDTO.RequestNoticeDraft dto)
- FastAPI `POST /ai/notice-draft` 내부 호출 (RestTemplate 또는 WebClient)
- 타임아웃 10초 초과 시 `AI_SERVER_UNAVAILABLE(503)` 예외 발생
- 반환: `AiDTO.ResponseDraft(draft)`

#### generateFaqDraft(AiDTO.RequestFaqDraft dto)
- FastAPI `POST /ai/faq-draft` 내부 호출
- 타임아웃 10초 초과 시 `AI_SERVER_UNAVAILABLE(503)` 예외 발생
- 반환: `AiDTO.ResponseDraft(draft)`

#### generateInquiryDraft(AiDTO.RequestInquiryDraft dto)
- FastAPI `POST /ai/inquiry-draft` 내부 호출
- 타임아웃 10초 초과 시 `AI_SERVER_UNAVAILABLE(503)` 예외 발생
- 반환: `AiDTO.ResponseDraft(draft)`

---

### AdminInquiryService

#### getInquiries(category, status, page, size)
- 동적 필터 (`category`, `status` null이면 미적용)
- page 1-based → 0-based 변환
- 기본 정렬: `createdAt DESC`

#### getInquiryDetail(Long inquiryId)
- `INQUIRY_NOT_FOUND(404)` 예외 처리
- 회원명(`memberName`)은 조인 또는 별도 조회 후 DTO에 포함

#### saveReply(Long inquiryId, String reply, Long adminId)
- `INQUIRY_NOT_FOUND(404)` 예외 처리
- `inquiryStatus == COMPLETED` → `INQUIRY_ALREADY_COMPLETED(409)` 예외
- `inquiry.saveReply(reply, adminId)` 호출 (PENDING/IN_PROGRESS 모두 허용)
- `@Transactional` 적용
- 반환: `ResponseReply(inquiryId, inquiryStatus, repliedAt)`

#### completeInquiry(Long inquiryId, Long adminId)
- `INQUIRY_NOT_FOUND(404)` 예외 처리
- `inquiryStatus != IN_PROGRESS` → `INQUIRY_NOT_IN_PROGRESS(400)` 예외
- `inquiry.complete()` 호출
- `@Transactional` 적용
- 반환: `ResponseComplete(inquiryId, COMPLETED, completedAt)`

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 공지사항 조회·수정·삭제 실패 |
| `FAQ_NOT_FOUND` | 404 | FAQ 조회·수정·삭제 실패 |
| `INQUIRY_NOT_FOUND` | 404 | 문의 조회·답변·완료 처리 실패 |
| `INQUIRY_ALREADY_COMPLETED` | 409 | COMPLETED 문의 답변 수정 시도 |
| `INQUIRY_NOT_IN_PROGRESS` | 400 | IN_PROGRESS 아닌 문의 처리 완료 시도 |
| `AI_SERVER_UNAVAILABLE` | 503 | FastAPI 타임아웃(10초) 초과 또는 연결 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
