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
      size > 100 → 100으로 clamp

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
- `size > 100` → 100으로 clamp
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

---

## User Stories

### Story 1 — 공지사항 목록 조회 (P1)

**As** 사용자
**I want** 공지사항 목록을 카테고리·키워드로 검색하고 싶다
**So that** 필요한 공지를 빠르게 찾을 수 있다

**Scenario 1**: 필터 없이 전체 조회 (비로그인)
- Given is_visible=true 공지사항이 존재할 때
- When GET /api/v1/user/notices 요청 시
- Then is_pinned=true 건 상단 정렬 후 created_at DESC 순으로 반환된다

**Scenario 2**: 카테고리 필터
- Given category=NOTICE로 요청 시
- When GET /api/v1/user/notices?category=NOTICE 요청 시
- Then NOTICE 카테고리 공지만 반환된다

**Scenario 3**: is_visible=false 공지 비노출
- Given is_visible=false 공지가 존재할 때
- When GET /api/v1/user/notices 요청 시
- Then 해당 공지는 반환되지 않는다

---

### Story 2 — 공지사항 상세 조회 (P1)

**As** 사용자
**I want** 공지사항 상세 내용과 이전·다음 공지를 확인하고 싶다
**So that** 공지를 순서대로 탐색할 수 있다

**Scenario 1**: 정상 조회
- Given 유효한 noticeId로 요청 시
- When GET /api/v1/user/notices/{noticeId} 요청 시
- Then 공지 상세 내용과 이전·다음 공지 링크, 업데이트된 view_count를 반환한다

**Scenario 2**: is_visible=false 공지 조회
- Given is_visible=false인 noticeId로 요청 시
- When GET /api/v1/user/notices/{noticeId} 요청 시
- Then 404 NOTICE_NOT_FOUND를 반환한다

---

### Story 3 — FAQ 조회 (P2)

**As** 사용자
**I want** 자주 묻는 질문을 카테고리·키워드로 검색하고 싶다
**So that** 문의 접수 전에 답변을 스스로 찾을 수 있다

**Scenario 1**: 전체 FAQ 조회
- Given FAQ 데이터가 존재할 때
- When GET /api/v1/user/faqs 요청 시
- Then 전체 FAQ 목록을 created_at ASC 순으로 반환한다

**Scenario 2**: 키워드 검색
- Given keyword=비밀번호로 요청 시
- When GET /api/v1/user/faqs?keyword=비밀번호 요청 시
- Then question 또는 answer에 "비밀번호"가 포함된 FAQ만 반환한다

---

### Story 4 — 1:1 문의 목록 조회 (P1)

**As** 로그인 사용자
**I want** 내가 접수한 1:1 문의 목록을 확인하고 싶다
**So that** 처리 현황을 모니터링할 수 있다

**Scenario 1**: 정상 조회
- Given 로그인된 회원이 접수한 문의가 존재할 때
- When GET /api/v1/user/inquiries 요청 시
- Then 본인 문의만 created_at DESC 순으로 반환된다

**Scenario 2**: 미인증 요청
- Given JWT 토큰 없이 요청 시
- When GET /api/v1/user/inquiries 요청 시
- Then 401 UNAUTHORIZED를 반환한다

---

### Story 5 — 1:1 문의 접수 (P1)

**As** 로그인 사용자
**I want** 1:1 문의를 접수하고 싶다
**So that** 문제 해결 지원을 요청할 수 있다

**Scenario 1**: 정상 접수
- Given 로그인된 회원이 category, title, content를 포함하여 요청 시
- When POST /api/v1/user/inquiries 요청 시
- Then 201 응답과 함께 inquiry_status = PENDING으로 생성된 inquiryId를 반환한다

**Scenario 2**: 내용 10자 미만
- Given content가 10자 미만인 경우
- When POST /api/v1/user/inquiries 요청 시
- Then 400 INVALID_INQUIRY_CONTENT를 반환한다

**Scenario 3**: 미인증 요청
- Given JWT 토큰 없이 요청 시
- When POST /api/v1/user/inquiries 요청 시
- Then 401 UNAUTHORIZED를 반환한다

---

## Functional Requirements

- FR-001: 공지사항 목록은 is_visible=true 건만 반환해야 한다
- FR-002: 공지사항 목록 정렬은 is_pinned=true 우선, 이후 created_at DESC이어야 한다
- FR-003: 공지사항 목록은 category, keyword(title·content ILIKE) 필터를 지원해야 한다
- FR-004: page < 1 또는 size < 1 요청 시 400을 반환해야 한다
- FR-005: size > 100 요청 시 100으로 clamp해야 한다
- FR-006: 공지사항 상세 조회 시 view_count를 +1 해야 한다 (@Transactional)
- FR-007: 공지사항 상세에 이전·다음 공지(is_visible=true 조건)를 포함해야 한다
- FR-008: is_visible=false 공지 상세 조회 시 404 NOTICE_NOT_FOUND를 반환해야 한다
- FR-009: FAQ 목록은 페이지네이션 없이 전체를 반환해야 한다
- FR-010: FAQ keyword 검색은 question OR answer ILIKE로 처리해야 한다
- FR-011: FAQ 기본 정렬은 created_at ASC이어야 한다
- FR-012: 문의 목록은 로그인 회원 본인(member_id) 문의만 반환해야 한다
- FR-013: 문의 접수 시 inquiry_status = PENDING, member_id = 로그인 회원 ID로 저장해야 한다
- FR-014: 문의 content가 10자 미만이면 400 INVALID_INQUIRY_CONTENT를 반환해야 한다
- FR-015: 문의 목록·접수 API는 JWT 인증 + USER 권한이 필수이어야 한다

---

## Edge Cases

- EC-001: is_visible=false 공지 상세 조회 → 404 NOTICE_NOT_FOUND
- EC-002: 존재하지 않는 noticeId 조회 → 404 NOTICE_NOT_FOUND
- EC-003: page < 1 → 400 BAD_REQUEST
- EC-004: size > 100 → 100으로 clamp (오류 아님)
- EC-005: FAQ keyword 검색 결과 없음 → 빈 리스트 반환 (404 아님)
- EC-006: 문의 목록 조회 시 타인 member_id 접근 → 본인 데이터만 반환 (Security Context 기준)
- EC-007: 문의 content 10자 미만 → 400 INVALID_INQUIRY_CONTENT
- EC-008: 문의 목록·접수 미인증 → 401 UNAUTHORIZED
- EC-009: 이전·다음 공지가 없는 경우 → prevNotice, nextNotice를 null로 반환

---

## Success Criteria

- SC-001: is_visible=false 공지가 목록·상세에서 노출되지 않는다
- SC-002: 공지 목록에서 is_pinned=true 건이 상단 정렬된다
- SC-003: 공지 상세 조회 시 view_count가 정확히 +1된다
- SC-004: 이전·다음 공지가 없는 경우 null로 반환된다
- SC-005: 문의 목록이 본인 문의만 반환된다
- SC-006: 문의 접수 후 inquiry_status = PENDING으로 생성된다
- SC-007: 미인증 문의 목록·접수 요청 시 401이 반환된다
- SC-008: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다