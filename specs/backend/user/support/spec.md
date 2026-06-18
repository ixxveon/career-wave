# Spec: 사용자 고객센터 API (User Support)

**Feature Branch**: `feature/user-support-notice-faq` (Phase 1), `feature/user-support-inquiry` (Phase 2)
**버전**: v2
**Status**: 스펙 수정 완료
**담당**: 신보라

---

## 도메인 개요

회원이 공지사항·FAQ를 조회하고 1:1 문의를 접수·확인하는 사용자 고객센터 REST API.
`notices`, `faqs`, `inquiries` 테이블은 admin/cs 도메인과 공유하며,
user/support는 READ 전용(notices·faqs) + 문의 접수·본인 조회(inquiries) 역할을 담당한다.

- 공지사항·FAQ: 인증 없이 조회 가능 (비로그인 허용)
- 1:1 문의 목록·접수: JWT 인증 + USER 권한 필수
- `is_visible = false` 공지는 절대 반환하지 않는다
- admin/cs 패키지 클래스를 직접 import하지 않는다

---

## 구현 단계 분리

| Phase | 브랜치 | 포함 기능 | 인증 |
|---|---|---|---|
| Phase 1 | `feature/user-support-notice-faq` | 공지사항 조회, FAQ 조회 | 불필요 |
| Phase 2 | `feature/user-support-inquiry` | 1:1 문의 목록·접수 | JWT 필수 |

---

## ERD (참조)

> notices, faqs, inquiries 테이블은 admin/cs에서 정의.
> user/support는 해당 테이블을 조회 전용 또는 문의 INSERT 전용으로 접근.
> Entity 공유 방식: user 전용 Repository를 별도 정의하여 admin/cs 패키지 직접 참조 금지.

### notices (참조)

| 컬럼 | 타입 | user/support 활용 |
|---|---|---|
| `notice_id` | BIGSERIAL PK | 상세 조회 키 |
| `category` | VARCHAR(20) | 필터 기준 (`NOTICE/UPDATE/EVENT/MAINTENANCE`) |
| `title` | VARCHAR(200) | 목록 표시 |
| `content` | TEXT | 상세 표시 |
| `is_pinned` | BOOLEAN | `true`인 건 상단 정렬 |
| `is_visible` | BOOLEAN | `true`인 건만 반환 |
| `view_count` | INTEGER | 상세 조회 시 +1 |
| `created_at` | TIMESTAMPTZ | 등록일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

### faqs (참조)

| 컬럼 | 타입 | user/support 활용 |
|---|---|---|
| `faq_id` | BIGSERIAL PK | 조회 키 |
| `category` | VARCHAR(20) | 필터 기준 (`ACCOUNT/PAYMENT/SERVICE/ETC`) |
| `question` | VARCHAR(500) | 목록·검색 |
| `answer` | TEXT | 아코디언 내용 |
| `created_at` | TIMESTAMPTZ | 등록일 |

### inquiries (참조)

| 컬럼 | 타입 | user/support 활용 |
|---|---|---|
| `inquiry_id` | BIGSERIAL PK | 조회 키 |
| `member_id` | UUID FK | 본인 조회 필터 |
| `category` | VARCHAR(20) | 카테고리 필터 (`REFUND/PAYMENT_ERROR/SERVICE/ACCOUNT/ETC`) |
| `title` | VARCHAR(200) | 목록 표시 |
| `content` | TEXT | 상세 표시 |
| `reply` | TEXT NULL | 관리자 답변 (null이면 미답변) |
| `inquiry_status` | VARCHAR(20) | 상태 표시 (`PENDING/IN_PROGRESS/COMPLETED`) |
| `created_at` | TIMESTAMPTZ | 접수일 |

> `ai_summary`, `ai_draft`, `version`, `admin_id`, `updated_at`, `replied_at`, `completed_at`은 DB에 존재하나 user/support에서는 사용하지 않는다.

---

## 패키지 구조

```text
user/support/
├── controller/
│   ├── UserNoticeController.java
│   └── UserFaqController.java          ← Phase 1
│   └── UserInquiryController.java      ← Phase 2
├── docs/
│   ├── UserNoticeControllerDocs.java
│   ├── UserFaqControllerDocs.java      ← Phase 1
│   └── UserInquiryControllerDocs.java  ← Phase 2
├── dto/
│   └── SupportDTO.java
├── repository/
│   ├── UserNoticeRepository.java       ← user 전용 (admin/cs 참조 금지)
│   ├── UserNoticeQueryRepository.java  ← Native Query (동적 필터·페이지네이션)
│   ├── UserFaqQueryRepository.java     ← Native Query (동적 필터)
│   └── UserInquiryRepository.java
└── service/
    ├── UserNoticeService.java
    ├── UserFaqService.java
    ├── UserInquiryService.java
    └── impl/
        ├── UserNoticeServiceImpl.java
        ├── UserFaqServiceImpl.java
        └── UserInquiryServiceImpl.java
```

> `admin/cs/` 패키지 클래스를 직접 import하지 않는다.
> notices·faqs·inquiries 접근은 `user/support/repository/` 하위의 user 전용 Repository를 통해서만 수행한다.

---

## DTO 구조

### SupportDTO.java

```java
public class SupportDTO {

    // 공지사항 목록 항목
    public record NoticeList(
        Long noticeId,
        NoticeCategory category,   // NOTICE / UPDATE / EVENT / MAINTENANCE
        String title,
        boolean isPinned,
        int viewCount,
        ZonedDateTime createdAt
    ) {}

    // 공지사항 상세
    public record NoticeDetail(
        Long noticeId,
        NoticeCategory category,
        String title,
        String content,
        boolean isPinned,
        int viewCount,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt,
        PrevNext prevNotice,       // null 허용
        PrevNext nextNotice        // null 허용
    ) {
        public record PrevNext(Long noticeId, String title) {}
    }

    // FAQ 항목
    public record FaqItem(
        Long faqId,
        FaqCategory category,      // ACCOUNT / PAYMENT / SERVICE / ETC
        String question,
        String answer,
        ZonedDateTime createdAt
    ) {}

    // 문의 목록 항목
    public record InquiryList(
        Long inquiryId,
        InquiryCategory category,  // REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC
        String title,
        String contentPreview,     // 최대 100자 잘라내기 (서비스 레이어에서 처리)
        String reply,              // null이면 미답변
        InquiryStatus inquiryStatus, // PENDING / IN_PROGRESS / COMPLETED
        ZonedDateTime createdAt
    ) {}

    // 문의 접수 요청
    public record RequestCreateInquiry(
        @NotNull InquiryCategory category,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(min = 10) String content
    ) {}

    // 문의 접수 응답
    public record ResponseCreateInquiry(
        Long inquiryId,
        InquiryStatus inquiryStatus  // PENDING
    ) {}
}
```

> enum 타입은 `user/support/type/` 패키지에 정의:
> - `NoticeCategory`: `NOTICE, UPDATE, EVENT, MAINTENANCE`
> - `FaqCategory`: `ACCOUNT, PAYMENT, SERVICE, ETC`
> - `InquiryCategory`: `REFUND, PAYMENT_ERROR, SERVICE, ACCOUNT, ETC`
> - `InquiryStatus`: `PENDING, IN_PROGRESS, COMPLETED`

---

## API 명세

### 공지사항

```http
GET /api/v1/user/notices?category=&keyword=&page=1&size=20
      → ApiResponse<PaginationResponse<SupportDTO.NoticeList>>
      is_visible=true 건만 반환, is_pinned=true 건 상단 정렬 후 created_at DESC
      page < 1 → BAD_REQUEST(400)
      size > 100 → 400 반환

GET /api/v1/user/notices/{noticeId}
      → ApiResponse<SupportDTO.NoticeDetail>
      조회 시 view_count + 1 (UPDATE 쿼리, @Transactional)
      is_visible=false 또는 미존재 → NOTICE_NOT_FOUND(404)
```

### FAQ

```http
GET /api/v1/user/faqs?category=&keyword=
      → ApiResponse<List<SupportDTO.FaqItem>>
      페이지네이션 없음, 전체 목록 반환
      keyword: question OR answer ILIKE 검색
      created_at ASC 정렬
```

### 1:1 문의 (로그인 필수)

```http
GET /api/v1/user/inquiries?category=
      → ApiResponse<List<SupportDTO.InquiryList>>
      로그인 회원 본인(member_id) 문의만 반환, created_at DESC

POST /api/v1/user/inquiries
      Body: SupportDTO.RequestCreateInquiry
      → ApiResponse<SupportDTO.ResponseCreateInquiry>  (201)
      inquiry_status = PENDING으로 생성
```

---

## 서비스 로직

### UserNoticeService

#### getNotices(category, keyword, page, size)
- `is_visible = true` 필터 필수
- `is_pinned = true` 건 우선 정렬 후 `created_at DESC`
- `keyword` → `title ILIKE %keyword%` OR `content ILIKE %keyword%`
- `page < 1` 또는 `size < 1` → `BAD_REQUEST(400)` 예외
- `size > 100` → `BAD_REQUEST(400)` 예외
- page 1-based → 0-based 변환
- 반환: `PaginationResponse<SupportDTO.NoticeList>`

#### getNoticeDetail(Long noticeId)
- `is_visible = false` 또는 존재하지 않으면 `NOTICE_NOT_FOUND(404)`
- `view_count + 1` UPDATE — `@Transactional`
- 이전·다음 공지: 같은 `is_visible = true` 조건에서 `notice_id` 기준 인접 건 조회
- 반환: `SupportDTO.NoticeDetail`

---

### UserFaqService

#### getFaqs(category, keyword)
- `category` null이면 전체
- `keyword` → `question ILIKE %keyword%` OR `answer ILIKE %keyword%`
- `created_at ASC` 정렬 (FAQ는 오래된 순)
- 반환: `List<SupportDTO.FaqItem>`

---

### UserInquiryService

#### getMyInquiries(UUID memberId, category)
- `member_id = memberId` 필터 필수 (타인 조회 차단)
- `category` null이면 전체
- `created_at DESC` 정렬
- 반환: `List<SupportDTO.InquiryList>`

#### createInquiry(UUID memberId, RequestCreateInquiry dto)
- `inquiry_status = PENDING`으로 생성
- `member_id = memberId` 설정
- `@Transactional` 적용
- 반환: `SupportDTO.ResponseCreateInquiry`

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `NOTICE_NOT_FOUND` | 404 | 공지사항 조회 실패 또는 is_visible=false |
| `UNAUTHORIZED` | 401 | 문의 목록·접수 시 미인증 |
| `BAD_REQUEST` | 400 | page < 1, size < 1 |
| `INVALID_INQUIRY_CONTENT` | 400 | 문의 내용 10자 미만 (Phase 2) |

> ErrorCode는 `user/support/exception/UserSupportErrorCode.java`에 정의한다.

---

## Assumptions

- notices, faqs, inquiries Entity는 JPA Native Query 또는 user 전용 Repository(`JpaRepository` 상속)로 접근하며, admin/cs 패키지 직접 참조 금지
- 공지·FAQ 조회는 비로그인 허용 (`permitAll()` 설정)
- 문의 목록·접수는 JWT 인증 + USER 권한 필수
- 문의 답변 알림(이메일/푸시)은 v1 범위 외
- `view_count` 중복 증가 방지(동일 세션/IP)는 v2 고려
