# Tasks: 정산 관리 (Settlement)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — 타입 & 상수 정의

### 타입

```ts
type SettlementStatus = 'PENDING' | 'CONFIRMED';
type SettlementItemType = 'PAYMENT' | 'REFUND';
```

### 상수

```ts
const settlementStatusLabel: Record<SettlementStatus, string> = {
  PENDING:   '대기',
  CONFIRMED: '확정',
};

const settlementItemTypeLabel: Record<SettlementItemType, string> = {
  PAYMENT: '결제',
  REFUND:  '환불',
};
```

### 인터페이스

```ts
interface SettlementListItem {
  settlementId: number;
  periodStart: string;
  periodEnd: string;
  totalSalesAmount: number;
  totalRefundAmount: number;
  netSalesAmount: number;
  totalTransactionCount: number;
  settlementStatus: SettlementStatus;
  createdAt: string;
}

interface SettlementDetail extends SettlementListItem {
  supplyAmount: number;
  vatAmount: number;
  paidCount: number;
  refundCount: number;
  settledAt: string | null;
  settledByName: string | null;
  note: string | null;
  items: SettlementItemDetail[];
}

interface SettlementItemDetail {
  settlementItemId: number;
  paymentId: string;
  orderId: string;
  memberName: string;
  planName: string;
  amount: number;
  itemType: SettlementItemType;
  paymentApprovedAt: string;
}
```

### 체크리스트

- [ ] `SettlementStatus`, `SettlementItemType` 타입 선언
- [ ] `settlementStatusLabel`, `settlementItemTypeLabel` 상수 선언
- [ ] `SettlementListItem`, `SettlementDetail`, `SettlementItemDetail` 인터페이스 선언

---

## Phase 2 — 정산 목록 페이지

- [ ] `SettlementListPage.tsx` 구현 (기존 플레이스홀더 교체)
- [ ] 상태 필터 드롭다운 (전체 / PENDING / CONFIRMED)
- [ ] 정산 목록 테이블 컬럼: 정산기간 / 총매출 / 총환불 / 순매출 / 거래건수 / 상태
- [ ] 상태 배지: PENDING(노란색) / CONFIRMED(초록색)
- [ ] 금액 포맷: `toLocaleString('ko-KR')` + "원"
- [ ] 행 클릭 → 정산 상세 페이지 이동 (`/admin/settlements/{settlementId}`)
- [ ] 페이지네이션 컴포넌트 (page, size, totalPages)
- [ ] 빈 목록 시 "정산 내역이 없습니다" 표시

---

## Phase 3 — 수동 생성

- [ ] "정산 생성" 버튼 (목록 상단)
- [ ] `GenerateModal` 컴포넌트
  - [ ] 시작일 / 종료일 DatePicker
  - [ ] 유효성 검증: 시작일 >= 종료일 → 생성 버튼 비활성
  - [ ] "생성" 클릭 → `POST /api/v1/admin/settlements/generate` 호출
  - [ ] 생성 중 버튼 `disabled` + 로딩 상태
  - [ ] 성공 → 모달 닫기 + 목록 재조회 + 토스트 메시지
  - [ ] 409 ALREADY_CONFIRMED → "이미 확정된 정산이 존재합니다" 에러 표시
  - [ ] 409 DUPLICATE_PERIOD (PENDING) → 서버가 삭제 후 재생성 처리, 프론트는 성공으로 처리

---

## Phase 4 — 정산 상세 페이지

- [ ] `SettlementDetailPage.tsx` 생성
- [ ] 라우트 등록: `/admin/settlements/:settlementId`
- [ ] 정산 요약 카드
  - [ ] 정산 기간 (시작일 ~ 종료일)
  - [ ] 총매출 / 총환불 / 순매출
  - [ ] 공급가액 / 부가세
  - [ ] 결제 건수 / 환불 건수
  - [ ] 확정자 / 확정일 / 메모 (CONFIRMED 건만 표시)
- [ ] 포함 항목 테이블
  - [ ] 컬럼: 결제ID / 주문번호 / 회원명 / 상품명 / 금액 / 유형 / 결제승인일
  - [ ] 유형 배지: PAYMENT(파란색) / REFUND(빨간색)
- [ ] "정산 확정" 버튼 (PENDING 건만 노출)
- [ ] "목록으로" 뒤로가기 버튼

---

## Phase 5 — 정산 확정

- [ ] `ConfirmModal` 컴포넌트
  - [ ] 확인 메시지: "정산을 확정하시겠습니까? 확정 후 취소할 수 없습니다."
  - [ ] 메모 입력 필드 (선택, textarea)
  - [ ] "확정" 클릭 → `PATCH /api/v1/admin/settlements/{id}/confirm` 호출
  - [ ] 확정 중 버튼 `disabled` + 로딩 상태
  - [ ] 성공 → 서버 응답 기준 상태 갱신 (CONFIRMED), 확정 버튼 제거
  - [ ] 409 ALREADY_CONFIRMED → "이미 확정된 정산입니다" 에러 표시

---

## Phase 6 — API 연동

### settlementApi.ts 작성

```ts
// frontend/src/api/admin/settlementApi.ts
import axiosInstance from '@/utils/axiosInstance';

export const fetchSettlements = (params: {
  status?: string;
  page: number;
  size: number;
}): Promise<{ items: SettlementListItem[]; page: number; size: number; totalItems: number; totalPages: number }> =>
  axiosInstance.get('/api/v1/admin/settlements', { params }).then(r => r.data.data);

export const fetchSettlementDetail = (settlementId: number): Promise<SettlementDetail> =>
  axiosInstance.get(`/api/v1/admin/settlements/${settlementId}`).then(r => r.data.data);

export const generateSettlement = (body: {
  periodStart: string;
  periodEnd: string;
}): Promise<SettlementListItem> =>
  axiosInstance.post('/api/v1/admin/settlements/generate', body).then(r => r.data.data);

export const confirmSettlement = (settlementId: number, body: {
  note?: string;
}): Promise<{ settlementId: number; settlementStatus: string; settledAt: string }> =>
  axiosInstance.patch(`/api/v1/admin/settlements/${settlementId}/confirm`, body).then(r => r.data.data);
```

### API 연동 체크리스트

- [ ] `settlementApi.ts` 파일 작성
- [ ] 정산 목록 API 연동 및 더미 데이터 제거 (`GET /api/v1/admin/settlements`)
- [ ] 상태 필터 쿼리 파라미터 연결
- [ ] 목록 페이지네이션 연결 (page, size)
- [ ] 정산 상세 API 연동 (`GET /api/v1/admin/settlements/{settlementId}`)
- [ ] 수동 생성 API 연동 (`POST /api/v1/admin/settlements/generate`)
- [ ] 정산 확정 API 연동 (`PATCH /api/v1/admin/settlements/{settlementId}/confirm`)
- [ ] `ApiResponse<T>` 형식 기반 성공·실패 처리
- [ ] API 실패 시 에러 메시지 표시 (`ApiResponse.message` 활용)
- [ ] 서버 409 응답 처리 (ALREADY_CONFIRMED, DUPLICATE_PERIOD)
- [ ] API 호출 중 로딩 상태(스피너) 표시
- [ ] API 성공 시 토스트 메시지 표시

---

## Phase 7 — 사이드바 권한

- [ ] 사이드바 메뉴에 정산 관리 항목 추가
- [ ] `adminRole === 'MASTER'` 조건으로 메뉴 노출 제어
- [ ] 기존 사이드바 권한 제어 패턴 참고하여 일관되게 적용
