# Checklist: 정산 관리 (Settlement)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — 타입 & 상수 정합성

- [ ] `SettlementStatus` 값이 `PENDING / CONFIRMED`만 사용한다.
- [ ] `SettlementItemType` 값이 `PAYMENT / REFUND`만 사용한다.
- [ ] 멘토 정산 관련 타입/상수가 코드에 없다.
- [ ] 금액 필드가 `number` 타입으로 선언되어 있다. (BIGINT 대응)

---

## Phase 2 — 정산 목록 페이지

- [ ] 목록 테이블에 정산기간·총매출·총환불·순매출·거래건수·상태 컬럼이 표시된다.
- [ ] 상태 필터가 전체 / PENDING / CONFIRMED 옵션을 포함한다.
- [ ] 상태 배지가 PENDING(노란색) / CONFIRMED(초록색)으로 표시된다.
- [ ] 금액이 `toLocaleString` 포맷 + "원" 단위로 표시된다.
- [ ] 행 클릭 시 상세 페이지(`/admin/settlements/{id}`)로 이동한다.
- [ ] 페이지네이션 컨트롤이 표시되고 페이지 이동이 동작한다.
- [ ] 빈 목록 시 안내 문구가 표시된다.

---

## Phase 3 — 수동 생성

- [ ] "정산 생성" 버튼이 목록 상단에 표시된다.
- [ ] GenerateModal에 시작일 / 종료일 DatePicker가 표시된다.
- [ ] 시작일 >= 종료일 시 생성 버튼이 비활성화된다.
- [ ] 생성 중 버튼이 `disabled` 처리되고 로딩 상태가 표시된다.
- [ ] 생성 성공 시 모달이 닫히고 목록이 재조회된다.
- [ ] 409 ALREADY_CONFIRMED 응답 시 에러 메시지가 표시된다.

---

## Phase 4 — 정산 상세 페이지

- [ ] 정산 요약에 기간·총매출·총환불·순매출·공급가액·부가세가 표시된다.
- [ ] CONFIRMED 건에 확정자·확정일·메모가 표시된다.
- [ ] 항목 테이블에 결제ID·주문번호·회원명·상품명·금액·유형·결제승인일이 표시된다.
- [ ] 유형 배지가 PAYMENT(파란색) / REFUND(빨간색)로 구분된다.
- [ ] PENDING 건에만 "정산 확정" 버튼이 노출된다.
- [ ] CONFIRMED 건에 확정 버튼이 미노출된다.
- [ ] "목록으로" 뒤로가기가 동작한다.

---

## Phase 5 — 정산 확정

- [ ] ConfirmModal에 확인 메시지와 메모 입력 필드가 표시된다.
- [ ] 확정 중 버튼이 `disabled` 처리된다.
- [ ] 확정 성공 시 서버 응답 기준으로 상태가 CONFIRMED로 갱신된다.
- [ ] 확정 성공 후 확정 버튼이 제거된다.
- [ ] 409 ALREADY_CONFIRMED 응답 시 에러 메시지가 표시된다.
- [ ] 낙관적 업데이트(Optimistic Update)를 사용하지 않는다.

---

## Phase 6 — API 연동

- [ ] 모든 HTTP 호출이 `settlementApi.ts`를 통해서만 수행된다.
- [ ] `paymentApi.ts`에서 정산 API를 호출하지 않는다.
- [ ] 페이지네이션 응답이 `items`, `page`, `size`, `totalItems`, `totalPages` 키를 사용한다.
- [ ] `page=1` 요청 시 첫 번째 페이지 결과가 반환된다.
- [ ] API 응답 처리 시 `res.data.success`를 먼저 확인 후 `res.data.data`에 접근한다.
- [ ] API 호출 중 로딩 상태(스피너)가 표시된다.
- [ ] API 성공 시 토스트 메시지가 표시된다.
- [ ] 서버 409 응답 시 에러 메시지가 적절히 표시된다.

---

## Phase 7 — 사이드바 권한

- [ ] 정산 관리 메뉴가 사이드바에 추가되어 있다.
- [ ] MASTER 역할에만 정산 관리 메뉴가 노출된다.
- [ ] MANAGER/VIEWER 역할에 정산 관리 메뉴가 미노출된다.
- [ ] 기존 사이드바 권한 제어 패턴과 일관된다.

---

## 머지 전 최종 확인

- [ ] `api-schema.md` 실제 구현과 일치
- [ ] `constitution.md` 불변 규칙과 실제 구현 일치 확인
- [ ] PR 제목 형식 준수
- [ ] `tasks.md` 모든 항목 완료 체크
