# Constitution: 사용자 고객센터 API (User Support)

**Feature Branch**: `feature/user-support-be-spec`
**Scope**: 공지사항 조회 / FAQ 조회 / 1:1 문의 접수·조회
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

회원은 공지사항·FAQ를 통해 스스로 궁금증을 해결하고,
해결되지 않는 경우 1:1 문의를 통해 관리자 답변을 받을 수 있어야 한다.

---

## 2. 상태 머신

inquiries.inquiry_status 전이는 admin/cs에서 관리.
user/support는 `PENDING` 상태로 문의 생성만 수행하고, 이후 전이는 처리하지 않는다.

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| admin/cs 직접 참조 금지 | user/support가 admin/cs 패키지를 import하지 않음 | CONVENTION.md — 도메인 간 직접 참조 금지 |
| Entity 공유 전략 | notices·faqs·inquiries Entity를 공통 domain 패키지로 분리 협의 | admin과 user가 동일 테이블을 사용하므로 Entity 중복 정의 금지 |
| 공지·FAQ 비인증 허용 | `permitAll()` Security 설정 | 서비스 정보 접근성 보장 |
| 문의 인증 필수 | JWT + USER 권한 | 본인 식별 필요 |
| is_visible 필터 | 모든 공지 조회에 `is_visible = true` 조건 필수 | 어드민이 숨긴 공지 User 미노출 보장 |
| view_count 증가 | 상세 조회 시 UPDATE, @Transactional | 클라이언트 직접 증가 금지 |
| 핀 공지 우선 정렬 | `is_pinned DESC, created_at DESC` | 중요 공지 상단 노출 |
| 본인 문의 필터 | `member_id = 인증된 회원 ID` 조건 필수 | 타인 문의 조회 차단 |
| Controller 분리 | UserNoticeController / UserFaqController / UserInquiryController | 도메인별 책임 분리 |

---

## 4. 불변 규칙

- `is_visible = false` 공지는 어떤 경우에도 반환하지 않는다. `NOTICE_NOT_FOUND(404)` 반환.
- 1:1 문의 목록은 반드시 인증된 회원 본인(`member_id`)의 문의만 반환한다.
- `view_count` 증가는 반드시 서버에서 UPDATE 쿼리로 처리한다.
- `inquiry_status`는 `PENDING`으로만 생성하며, user/support에서 상태 전이를 처리하지 않는다.
- `admin/cs/` 패키지 클래스를 `user/support/`에서 직접 import하는 것을 금지한다.
- Controller에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다.
- 모든 API 응답은 `ApiResponse<T>` 래퍼를 사용한다.

---

## 5. 연동 계약

- 프론트엔드 HTTP 계약 원본: `specs/frontend/user/006-support/api-schema.md`
- 제공 엔드포인트:
  - `GET /api/notices` — 공지사항 목록 (비인증 허용)
  - `GET /api/notices/{noticeId}` — 공지사항 상세 + view_count 증가 (비인증 허용)
  - `GET /api/faqs` — FAQ 목록 (비인증 허용)
  - `GET /api/inquiries` — 나의 문의 목록 (USER 인증 필수)
  - `POST /api/inquiries` — 문의 접수 (USER 인증 필수) → 201
- 공지 목록 응답: `is_pinned=true` 건 상단 정렬 후 `created_at DESC`
- FAQ 목록 응답: 페이지네이션 없음, 전체 목록 `created_at ASC`
- 문의 접수 응답: `{ inquiryId, inquiryStatus: "PENDING" }`

---

## 6. 금지 패턴

- `is_visible = false` 공지를 반환하는 것을 금지한다.
- 타인의 문의 내역을 반환하는 것을 금지한다. `member_id` 필터 필수.
- `view_count`를 클라이언트에서 전달받아 저장하는 것을 금지한다. 서버 내부 증가만 허용.
- `inquiry_status`를 user/support에서 `PENDING` 외의 값으로 설정하는 것을 금지한다.
- `admin/cs/` 패키지를 직접 참조하는 것을 금지한다.
- Spring 기본 `Page<T>` 객체를 API 응답으로 직접 반환하는 것을 금지한다.
