# Checklist: 사용자 고객센터 (User Support)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — ERD 정합성

- [ ] `NoticeCategory` 값이 ERD 기준 `NOTICE / UPDATE / EVENT / MAINTENANCE`만 사용한다.
- [ ] `FaqCategory` 값이 ERD 기준 `ACCOUNT / PAYMENT / SERVICE / ETC`만 사용한다.
- [ ] `InquiryCategory` 값이 ERD 기준 `REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC`만 사용한다.
- [ ] `InquiryStatus` 값이 ERD 기준 `PENDING / IN_PROGRESS / COMPLETED`만 사용한다.
- [ ] 카테고리·상태 API 송수신 시 ERD 영문 값을 사용하고, UI 표시만 한글로 변환한다.

---

## Phase 2 — 공지사항

- [ ] 공지사항 목록에 카테고리 필터(전체/공지/업데이트/이벤트/점검)가 표시된다.
- [ ] 카테고리 필터에 `이벤트(EVENT)` 버튼이 포함된다.
- [ ] 키워드 검색이 제목 기준으로 동작한다.
- [ ] `is_pinned = true` 공지가 목록 최상단에 고정 배지와 함께 표시된다.
- [ ] `is_visible = false` 공지가 목록에 표시되지 않는다.
- [ ] 공지 상세 페이지에 제목·카테고리·등록일·조회수·본문이 표시된다.
- [ ] 공지 상세 진입 시 `view_count`가 서버 API 호출을 통해 증가한다. (클라이언트 직접 증가 금지)
- [ ] 이전·다음 공지 네비게이션이 동작한다.

---

## Phase 3 — FAQ

- [ ] FAQ 카테고리 필터(전체/계정/구독결제/AI 서비스/기타)가 표시된다.
- [ ] 카테고리 필터가 ERD 기준(ACCOUNT/PAYMENT/SERVICE/ETC)으로 연결된다.
- [ ] 키워드 검색이 질문·답변 기준으로 동작한다.
- [ ] FAQ 아코디언이 단일 열림으로 동작한다 (하나 열면 다른 것은 닫힘).

---

## Phase 4 — 1:1 문의

- [ ] 나의 문의 목록에 카테고리 필터(전체/환불/구독결제/AI 서비스/계정/기타)가 표시된다.
- [ ] 카테고리 필터에 `환불(REFUND)` 버튼이 포함된다.
- [ ] 나의 문의 목록이 로그인한 회원 본인의 문의만 표시한다.
- [ ] 문의 상태 배지가 `PENDING→접수`, `IN_PROGRESS→처리 중`, `COMPLETED→답변 완료`로 표시된다.
- [ ] 상세 모달에서 `COMPLETED` 상태 문의의 답변 내용이 표시된다.
- [ ] 상세 모달에서 `PENDING` / `IN_PROGRESS` 상태 문의는 "답변 대기 중" 안내가 표시된다.

---

## Phase 5 — 문의 접수

- [ ] 문의 유형 선택 항목에 `환불(REFUND)` 버튼이 포함된다.
- [ ] 문의 유형·제목·내용(10자 이상) 미입력 시 접수 버튼이 비활성화된다.
- [ ] 문의 접수 시 카테고리 값을 ERD 영문(`REFUND`, `PAYMENT_ERROR` 등)으로 API에 전송한다.
- [ ] 미로그인 상태에서 문의 접수 페이지 접근 시 로그인 페이지로 리다이렉트된다.
- [ ] 접수 성공 시 완료 화면이 표시된다.

---

## Phase 6 — API 연동 전 체크

- [ ] `Notice` 인터페이스 필드(`isPinned`, `viewCount` 포함)가 백엔드 응답 DTO와 매핑 가능하다.
- [ ] `Inquiry` 인터페이스의 `reply` null 여부로 답변 표시 여부를 판단한다.
- [ ] 모든 HTTP 호출이 `supportApi.ts`를 통해서만 수행된다.
- [ ] API 성공·실패 응답이 `ApiResponse<T>` 형식을 기준으로 처리된다.
- [ ] API 호출 중 로딩 상태(스피너)가 표시된다.
- [ ] 서버 401 응답 시 로그인 페이지로 리다이렉트된다.
