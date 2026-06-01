# Constitution: 고객센터 관리 (Customer Service)

**Feature Branch**: `feature/admin-cs-fe-spec`
**Scope**: 공지사항 탭, FAQ 탭, 1:1 문의 탭 공통 규칙
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

관리자는 공지사항과 FAQ를 직접 작성·관리하고,
회원이 접수한 1:1 문의에 답변하여 서비스 신뢰를 유지해야 한다.

AI 초안 생성 기능은 관리자의 답변 작성 효율을 높이기 위한 보조 수단이며,
최종 내용은 반드시 관리자가 검토·확정한다.

---

## 2. 상태 머신

### inquiries.inquiry_status 전이

```text
PENDING
  → IN_PROGRESS  (답변 저장 시 자동 전이)

IN_PROGRESS
  → COMPLETED    (처리 완료 버튼 클릭)

COMPLETED
  → (복구 불가, 답변 수정 UI 미노출)
```

| 전이 | 허용 여부 | 트리거 |
|---|---|---|
| PENDING → IN_PROGRESS | 허용 | 답변 저장 버튼 클릭 |
| IN_PROGRESS → COMPLETED | 허용 | 처리 완료 버튼 클릭 |
| PENDING → COMPLETED | 금지 | IN_PROGRESS 선행 필요 |
| COMPLETED → 기타 | 금지 | UI 미노출 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| 3탭 구조 | 공지사항 / FAQ / 1:1 문의 탭 분리 | 도메인 성격이 다르므로 상태 변수 혼합 금지 |
| 등록/수정 모달 | 탭 내 인라인 모달 처리 | 페이지 이동 없이 CRUD 처리 |
| 문의 답변 모달 | 상세 + 답변 입력창 통합 | 문의 내용 확인 후 즉시 답변 가능 |
| AI 초안 | 입력창 내 "AI 초안 생성" 버튼 | 초안 생성 후 관리자가 직접 수정 가능해야 함 |
| KPI 카드 | 공지 수 / FAQ 수 / 미답변 수 / 답변 중 수 | CS 현황 한눈에 파악 |

---

## 4. 불변 규칙

- 공지사항·FAQ·문의 데이터를 동일 상태 변수에 혼합하는 것을 금지한다.
- `COMPLETED` 상태 문의에는 답변 저장·처리 완료 버튼을 노출하지 않는다.
- AI 초안 생성 버튼은 필수 입력값(제목 또는 질문)이 없으면 비활성화한다.
- AI 초안은 입력창에 자동 입력되며, 관리자가 직접 수정 후 저장한다. 자동 저장되지 않는다.
- 공지사항 삭제는 확인 모달 없이 즉시 실행할 수 없다. 반드시 확인 모달을 거쳐야 한다.
- 문의 답변 저장 시 `PENDING → IN_PROGRESS` 전이는 프론트에서 직접 상태를 바꾸지 않고, 서버 응답 기준으로 갱신한다.
- `InquiryStatus` enum 값은 ERD 기준 `PENDING / IN_PROGRESS / COMPLETED`만 사용한다.
- `NoticeCategory` enum 값은 ERD 기준 `NOTICE / UPDATE / EVENT / MAINTENANCE`만 사용한다.
- `FaqCategory` enum 값은 ERD 기준 `ACCOUNT / PAYMENT / SERVICE / ETC`만 사용한다.
- `InquiryCategory` enum 값은 ERD 기준 `REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC`만 사용한다.

---

## 5. 연동 계약

- `admin-backend`는 아래 API를 제공한다:
  - `GET /api/admin/cs/summary` — KPI 집계 (noticeCount, faqCount, pendingCount, inProgressCount)
  - `GET /api/admin/notices` — 공지사항 목록 (category, visible, page, size)
  - `GET /api/admin/notices/{noticeId}` — 공지사항 단건
  - `POST /api/admin/notices` — 공지사항 등록
  - `PUT /api/admin/notices/{noticeId}` — 공지사항 수정
  - `DELETE /api/admin/notices/{noticeId}` — 공지사항 삭제
  - `GET /api/admin/faqs` — FAQ 목록 (category, page, size)
  - `POST /api/admin/faqs` — FAQ 등록
  - `PUT /api/admin/faqs/{faqId}` — FAQ 수정
  - `DELETE /api/admin/faqs/{faqId}` — FAQ 삭제
  - `GET /api/admin/inquiries` — 문의 목록 (category, status, page, size)
  - `GET /api/admin/inquiries/{inquiryId}` — 문의 상세
  - `PUT /api/admin/inquiries/{inquiryId}/reply` — 답변 저장
  - `PUT /api/admin/inquiries/{inquiryId}/complete` — 처리 완료
  - `POST /api/admin/ai/notice-draft` — 공지 초안 생성 (FastAPI 연동)
  - `POST /api/admin/ai/faq-draft` — FAQ 답변 초안 생성 (FastAPI 연동)
  - `POST /api/admin/ai/inquiry-draft` — 문의 답변 초안 생성 (FastAPI 연동)
- 모든 응답은 `ApiResponse<T>` 형식 (`success`, `statusCode`, `message`, `data`)을 사용한다.
- 모든 HTTP 호출은 `frontend/src/admin/api/csApi.ts`를 통해서만 수행한다.

---

## 6. 금지 패턴

- 공지사항·FAQ·문의 상태를 하나의 상태 변수로 관리하는 것을 금지한다.
- `COMPLETED` 문의에 답변 저장·처리 완료 버튼을 노출하는 것을 금지한다.
- AI 초안 결과를 관리자 확인 없이 자동으로 저장·제출하는 것을 금지한다.
- 공지사항 삭제를 확인 모달 없이 즉시 실행하는 것을 금지한다.
- `InquiryStatus` 등 Enum에 ERD에 없는 값을 코드에서 가정하는 것을 금지한다.
- 프론트엔드에서 문의 상태를 직접 변경하는 것을 금지한다. 서버 응답 기준으로만 갱신한다.
