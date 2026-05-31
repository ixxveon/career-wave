# Constitution: 고객센터 관리 API (Customer Service)

**Feature Branch**: `feature/admin-cs-api`
**Scope**: 공지사항 CRUD / FAQ CRUD / 1:1 문의 답변·완료 처리 / KPI 집계 / AI 초안 생성
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

관리자는 공지사항·FAQ를 직접 등록·관리하고,
회원이 접수한 1:1 문의에 답변하여 서비스 신뢰를 유지해야 한다.

AI 초안 생성은 관리자 답변 효율을 높이기 위한 보조 수단이며,
FastAPI 서버 장애가 CRUD 핵심 기능에 영향을 주어서는 안 된다.

---

## 2. 상태 머신

### inquiries.inquiry_status 전이

```text
PENDING
  → IN_PROGRESS  (saveReply 호출 — PENDING/IN_PROGRESS 모두 허용, Service에서 COMPLETED 차단)

IN_PROGRESS
  → COMPLETED    (completeInquiry 호출)

COMPLETED
  → (전이 불가 — INQUIRY_ALREADY_COMPLETED 409)
```

| 전이 | 허용 여부 | 처리 방식 |
|---|---|---|
| PENDING → IN_PROGRESS | 허용 | saveReply 호출 시 `inquiry.saveReply()` → status 자동 전이 |
| IN_PROGRESS → IN_PROGRESS | 허용 | saveReply 재호출 (답변 수정) — status 유지 |
| IN_PROGRESS → COMPLETED | 허용 | completeInquiry 호출 시 `inquiry.complete()` 호출 |
| PENDING → COMPLETED | 금지 | `INQUIRY_NOT_IN_PROGRESS(400)` |
| COMPLETED → 기타 | 금지 | `INQUIRY_ALREADY_COMPLETED(409)` |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| 컨트롤러 분리 | AdminCsController / AdminNoticeController / AdminFaqController / AdminInquiryController | 도메인별 책임 분리, 파일 크기 관리 |
| AI 엔드포인트 소유 | AdminInquiryController (`/api/admin/ai/*`) | AI 초안 3종이 문의 답변 흐름과 밀접, 별도 컨트롤러 생성 대신 AdminInquiryController에 통합 |
| KPI 집계 위치 | AdminCsService.getSummary() → AdminCsController | 공지·FAQ·문의 3개 도메인 크로스 집계 → 특정 도메인 서비스에 종속 금지 |
| 동적 필터 | JPA Specification 또는 QueryDSL | null 조건 무시, AND 조건 결합 |
| page 1-based | Controller에서 `page - 1` 변환 후 Pageable 전달 | FE 계약(`page=1` 이 첫 페이지) 준수 |
| admin ↔ user 분리 | `user/` 패키지 클래스 직접 참조 금지 | CONVENTION.md — admin과 user는 서로 직접 참조 금지 |
| memberName 조회 | inquiries 조회 시 members 테이블 조인 (admin 전용 쿼리) | 목록·상세 응답에 memberName 포함 필요 |
| AI 서버 연동 | Spring → FastAPI 내부 호출 (RestTemplate/WebClient) | AI 초안 엔드포인트 외부 미노출 |
| AI 타임아웃 | 10초 초과 시 `AI_SERVER_UNAVAILABLE(503)` | FastAPI 장애가 CRUD 기능에 영향 없도록 분리 |
| 관리자 ID 추출 | Security Context (`@AuthenticationPrincipal`) | Controller에서 임의 파싱 금지 (CONVENTION.md) |
| 정렬 기본값 | `createdAt DESC` | 최신 항목 우선 노출 |

---

## 4. 불변 규칙

- `COMPLETED` 문의에 답변 저장 요청이 오면 반드시 `INQUIRY_ALREADY_COMPLETED(409)` 예외를 발생시킨다.
- `IN_PROGRESS`가 아닌 문의에 처리 완료 요청이 오면 반드시 `INQUIRY_NOT_IN_PROGRESS(400)` 예외를 발생시킨다.
- 문의 상태 전이는 반드시 Entity 비즈니스 메서드(`saveReply`, `complete`)를 통해서만 수행한다. 직접 필드 변경 금지.
- 모든 API 응답은 `ApiResponse<T>` 래퍼를 사용한다. Entity 또는 `Map`을 직접 반환하지 않는다.
- `NoticeCategory` enum 값은 ERD 기준 `NOTICE / UPDATE / EVENT / MAINTENANCE`만 사용한다.
- `FaqCategory` enum 값은 ERD 기준 `ACCOUNT / PAYMENT / SERVICE / ETC`만 사용한다.
- `InquiryCategory` enum 값은 ERD 기준 `REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC`만 사용한다.
- `InquiryStatus` enum 값은 ERD 기준 `PENDING / IN_PROGRESS / COMPLETED`만 사용한다.
- 모든 Enum 필드는 `@Enumerated(EnumType.STRING)`을 필수로 사용한다.
- Entity PK 전략은 `GenerationType.IDENTITY`를 사용한다.
- Entity에 public setter를 열지 않는다. 상태 변경은 비즈니스 메서드로만 수행한다.
- page 파라미터는 1-based로 받아 Service 내부에서 0-based로 변환한다.
- 페이지네이션 응답 형식은 `items`, `page`, `size`, `totalItems`, `totalPages` 키를 사용한다. Spring 기본 `Page` 객체를 직접 반환하지 않는다.
- AI 서버 장애(503) 시 CRUD 기능은 정상 동작해야 한다. AI 예외를 전파하지 않는다.

---

## 5. 연동 계약

- 프론트엔드 HTTP 계약 원본: `specs/frontend/admin/005-cs/api-schema.md`
- 제공 엔드포인트:
  - `GET /api/admin/cs/summary`
  - `GET /api/admin/notices`, `GET /api/admin/notices/{noticeId}`
  - `POST /api/admin/notices`, `PUT /api/admin/notices/{noticeId}`, `DELETE /api/admin/notices/{noticeId}`
  - `GET /api/admin/faqs`
  - `POST /api/admin/faqs`, `PUT /api/admin/faqs/{faqId}`, `DELETE /api/admin/faqs/{faqId}`
  - `GET /api/admin/inquiries`, `GET /api/admin/inquiries/{inquiryId}`
  - `PUT /api/admin/inquiries/{inquiryId}/reply`
  - `PUT /api/admin/inquiries/{inquiryId}/complete`
  - `POST /api/admin/ai/notice-draft`, `POST /api/admin/ai/faq-draft`, `POST /api/admin/ai/inquiry-draft`
- 답변 저장 성공 응답에 변경된 `inquiryStatus`와 `repliedAt`이 포함되어야 한다.
- 처리 완료 성공 응답에 변경된 `inquiryStatus`와 `completedAt`이 포함되어야 한다.

---

## 6. 금지 패턴

- `COMPLETED` 문의에 답변 저장 메서드를 실행하는 것을 금지한다. 상태 체크 후 예외 발생 필수.
- `PENDING` 상태 문의에 처리 완료 메서드를 실행하는 것을 금지한다.
- `user/` 패키지 클래스를 `admin/cs/` 에서 직접 import하는 것을 금지한다.
- Entity를 직접 반환하거나 `Map`을 직접 반환하는 것을 금지한다. `ApiResponse<DTO>`를 사용한다.
- `new RuntimeException(...)`을 직접 생성하는 것을 금지한다. `CustomException(ErrorCode.xxx)`를 사용한다.
- Controller에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다. `GlobalExceptionHandler`에 위임한다.
- Spring 기본 `Page<T>` 객체를 API 응답으로 직접 반환하는 것을 금지한다.
- AI 초안 API 실패를 공지사항·FAQ·문의 CRUD에 영향을 주는 방식으로 처리하는 것을 금지한다.
- ERD에 없는 Enum 값을 코드에서 가정하는 것을 금지한다.

