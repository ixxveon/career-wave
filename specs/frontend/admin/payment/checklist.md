# Checklist: 결제·정산 관리 (Payment & Settlement)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — ERD 정합성

- [ ] `PayStatus` 값이 ERD 기준 `PENDING / DONE / CANCELED / FAILED`만 사용한다.
- [ ] `RefundStatus` 값이 ERD 기준 `PENDING / COMPLETED / FAILED / REJECTED`만 사용한다.
- [ ] `PaymentType` 값이 ERD 기준 `MANUAL / AUTO_RENEWAL`만 사용한다.
- [ ] `SubStatus` 값이 ERD 기준 `ACTIVE / RENEWAL_SCHEDULED / CANCEL_SCHEDULED / AT_RISK`만 사용한다.
- [ ] 멘토 정산 관련 enum 값이 코드에 없다.

---

## Phase 2 — KPI 카드

- [ ] 결제 내역 탭 KPI 4종(이번달 총 매출 / 결제 건수 / 환불 요청 / 결제 실패)이 표시된다.
- [ ] 구독 현황 탭 KPI 4종(활성 / 갱신예정 / 취소예정 / 이탈위험)이 표시된다.

---

## Phase 3 — 결제 내역 탭

- [ ] 결제 목록에 결제ID·Toss주문번호·회원명·상품명·유형·결제일·금액·상태·관리 컬럼이 표시된다.
- [ ] 키워드 검색이 결제ID / Toss 주문번호 / 회원명 기준으로 동작한다.
- [ ] 상태 필터가 `DONE / PENDING / CANCELED / FAILED` 4종과 "전체" 옵션을 포함한다.
- [ ] 상태 배지가 `refundStatus` 존재 시 결제 상태 대신 환불 상태를 우선 표시한다.
- [ ] `refund_status = PENDING` 건의 관리 버튼이 "환불 처리"로 표시된다.
- [ ] 나머지 건의 관리 버튼이 "상세보기"로 표시된다.

---

## Phase 4 — 결제 상세 / 환불 처리 모달

- [ ] 모달에 상품명·결제일·금액·유형·결제 상태·환불 상태가 표시된다.
- [ ] `refund_status = PENDING` 건에만 환불 가능 여부 확인 섹션이 노출된다.
- [ ] 환불 확인 섹션에 결제 경과일(N일 경과, 7일 이내/초과)이 표시된다.
- [ ] 환불 확인 섹션에 이력서 분석 / AI 면접 유료 이용 횟수가 표시된다.
- [ ] 조건 충족 시 "환불 가능" 배지 + "환불 처리 확정" 버튼이 표시된다.
- [ ] 조건 미충족 시 "환불 불가" 배지 + 불가 사유 + "환불 불가 처리" 버튼이 표시된다.
- [ ] `refund_status = COMPLETED` 또는 `REJECTED` 건에는 처리 버튼이 미노출된다.
- [ ] `payment_status = PENDING` 또는 `FAILED` 건에는 환불 처리 버튼이 미노출된다.
- [ ] 모달 닫기 버튼 또는 외부 클릭으로 모달이 닫힌다.

---

## Phase 5 — 구독 현황 탭

- [ ] 구독 목록에 ID·회원명·구독플랜·시작일·다음갱신일·상태 컬럼이 표시된다.
- [ ] 상태 필터가 `ACTIVE / RENEWAL_SCHEDULED / CANCEL_SCHEDULED / AT_RISK` 4종과 "전체" 옵션을 포함한다.
- [ ] `AT_RISK` 구독자가 가장 최근 AUTO_RENEWAL 결제가 FAILED인 회원 기준으로 표시된다.

---

## Phase 6 — 정산 리포트 탭

- [ ] 정산 리포트 탭 클릭 시 "다음 버전에 구현 될 예정입니다." 안내 화면이 표시된다.
- [ ] 정산 리포트 탭에 실제 데이터·기능이 구현되어 있지 않다.

---

## Phase 7 — API 연동 전 체크

- [ ] `Payment` 인터페이스 필드가 백엔드 응답 DTO와 매핑 가능한 구조인지 확인한다.
- [ ] `Subscription` 인터페이스 필드가 백엔드 응답 DTO와 매핑 가능한 구조인지 확인한다.
- [ ] 환불 가능 여부 검증 로직(`daysSincePaid`, `checkRefundEligibility`)이 정확히 동작하는지 확인한다.
- [ ] 필터 쿼리 파라미터(`keyword`, `status`, `page`, `size`)가 현재 상태와 연결 가능한 구조인지 확인한다.
- [ ] 환불 처리 성공 응답의 `paymentStatus` / `refundStatus` 기반으로 목록 상태 배지를 갱신하는 로직이 구현되어 있는지 확인한다.
- [ ] API 성공·실패 응답이 `ApiResponse<T>` 형식을 기준으로 처리되는지 확인한다.
- [ ] 서버 409 응답(`REFUND_NOT_PENDING`) 시 에러 메시지가 표시되는지 확인한다.
- [ ] 모든 HTTP 호출이 `paymentApi.ts`를 통해서만 수행되는지 확인한다.
- [ ] 목록 페이지네이션 컨트롤이 표시되고 페이지 이동이 동작하는지 확인한다.
- [ ] API 호출 중 로딩 상태(스피너)가 표시되는지 확인한다.
- [ ] API 성공 시 토스트 메시지가 표시되는지 확인한다.
