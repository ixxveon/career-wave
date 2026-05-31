# Spec: 사용자 고객센터 API (User Support)

**Feature Branch**: `feature/user-support-be-spec`
**버전**: v1
**Status**: 스펙 완료
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

## ERD (참조)

> notices, faqs, inquiries 테이블은 admin/cs에서 정의.
> user/support는 해당 테이블을 조회 전용 또는 문의 INSERT 전용으로 접근.
> Entity 공유 방식: 구현 단계에서 공통 domain 패키지 분리 또는 user 전용 Repository 별도 정의로 결정.

### notices (참조)

| 컬럼 | 타입 | user/support 활용 |
|---|---|---|
| `notice_id` | BIGSERIAL PK | 상세 조회 키 |
| `category` | VARCHAR(20) | 필터 기준 |
| `title` | VARCHAR(200) | 목록 표시 |
| `content` | TEXT | 상세 표시 |
| `is_visible` | BOOLEAN | `true`인 건만 반환 |
| `is_pinned` | BOOLEAN | `true`인 건 상단 정렬 |
| `view_count` | INT | 상세 조회 시 +1 |
| `created_at` | TIMESTAMPTZ | 등록일 |

### faqs (참조)

| 컬럼 | 타입 | user/support 활용 |
|---|---|---|
| `faq_id` | BIGSERIAL PK | 조회 키 |
| `category` | VARCHAR(20) | 필터 기준 |
| `question` | VARCHAR(500) | 목록·검색 |
| `answer` | TEXT | 아코디언 내용 |
| `created_at` | TIMESTAMPTZ | 등록일 |

### inquiries (참조)

| 컬럼 | 타입 | user/support 활용 |
|---|---|---|
| `inquiry_id` | BIGSERIAL PK | 조회 키 |
| `member_id` | UUID FK | 본인 조회 필터 |
| `category` | VARCHAR(20) | 카테고리 필터 |
| `title` | VARCHAR(200) | 목록 표시 |
| `content` | TEXT | 상세 표시 |
| `reply` | TEXT NULL | 관리자 답변 |
| `inquiry_status` | VARCHAR(20) | 상태 표시 |
| `created_at` | TIMESTAMPTZ | 접수일 |

---

## 패키지 구조

```text
user/support/
├── controller/
│   ├── UserNoticeController.java
│   ├── UserFaqController.java
│   └── UserInquiryController.java
├── service/
│   ├── UserNoticeService.java
│   ├── UserFaqService.java
│   └── UserInquiryService.java
├── dto/
│   └── SupportDTO.java
└── docs/
    ├── UserNoticeControllerDocs.java
    ├── UserFaqControllerDocs.java
    └── UserInquiryControllerDocs.java
```

> `admin/cs/` 패키지 클래스를 직접 import하지 않는다.
> notices·faqs·inquiries 접근은 user 전용 Repository 또는 공통 domain 패키지를 통해서만 수행한다.

---

## DTO 구조

### SupportDTO.java

```java
public class SupportDTO {

    // 공지사항 목록 항목
    public record NoticeList(
        Long noticeId,
        String category,       // NOTICE / UPDATE / EVENT / MAINTENANCE
        String title,
        boolean isPinned,
        int viewCount,
        ZonedDateTime createdAt
    ) {}

    // 공지사항 상세
    public record NoticeDetail(
        Long noticeId,
        String category,
        String title,
        String content,
        boolean isPinned,
        int viewCount,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt,
        PrevNext prevNotice,   // null 허용
        PrevNext nextNotice    // null 허용
    ) {
        public record PrevNext(Long noticeId, String title) {}
    }

    // FAQ 항목
    public record FaqItem(
        Long faqId,
        String category,       // ACCOUNT / PAYMENT / SERVICE / ETC
        String question,
        String answer,
        ZonedDateTime createdAt
    ) {}

    // 문의 목록 항목
    public record InquiryList(
        Long inquiryId,
        String category,       // REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC
        String title,
        String content,        // 미리보기 — 최대 100자 잘라내기 (서비스 레이어에서 처리)
        String reply,          // null이면 미답변
        String inquiryStatus,  // PENDING / IN_PROGRESS / COMPLETED
        ZonedDateTime createdAt
    ) {}

    // 문의 접수 요청
    public record RequestCreateInquiry(
        @NotNull String category,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(min = 10) String content
    ) {}

    // 문의 접수 응답
    public record ResponseCreateInquiry(
        Long inquiryId,
        String inquiryStatus   // PENDING
    ) {}
}
```

---

## API 명세

### 공지사항

```http
GET /api/notices?category=&keyword=&page=1&size=20
      → ApiResponse<PaginationResponse<SupportDTO.NoticeList>>
      is_visible=true 건만 반환, is_pinned=true 건 상단 정렬 후 created_at DESC

GET /api/notices/{noticeId}
      → ApiResponse<SupportDTO.NoticeDetail>
      조회 시 view_count + 1 (UPDATE 쿼리, @Transactional)
      is_visible=false 건 → NOTICE_NOT_FOUND(404)
```

### FAQ

```http
GET /api/faqs?category=&keyword=
      → ApiResponse<List<SupportDTO.FaqItem>>
      페이지네이션 없음, 전체 목록 반환
      keyword: question OR answer LIKE 검색
```

### 1:1 문의 (로그인 필수)

```http
GET /api/inquiries?category=
      → ApiResponse<List<SupportDTO.InquiryList>>
      로그인 회원 본인(member_id) 문의만 반환, created_at DESC

POST /api/inquiries
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
- `keyword` → `title LIKE %keyword%`
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
- `keyword` → `question LIKE %keyword%` OR `answer LIKE %keyword%`
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
| `INVALID_INQUIRY_CONTENT` | 400 | 문의 내용 10자 미만 |

---

## Assumptions

- notices, faqs Entity는 admin/cs와 공유 → 구현 시 공통 domain 패키지 분리 협의 필요
- 공지·FAQ 조회는 비로그인 허용 (`permitAll()` 설정)
- 문의 목록·접수는 JWT 인증 + USER 권한 필수
- 문의 답변 알림(이메일/푸시)은 v1 범위 외
- `view_count` 중복 증가 방지(동일 세션/IP)는 v2 고려
