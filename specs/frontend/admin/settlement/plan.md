# Plan: 정산 관리 (Settlement)

**Feature Branch**: `feat/267-settlement-reports`
**담당**: 신보라
**버전**: v2
**상태**: 구현 예정

---

## Summary

MASTER 관리자 전용 정산 리포트 관리 페이지.
정산 목록 조회·상세 조회·수동 생성·정산 확정 기능을 제공한다.
기존 payment 탭의 정산 블라인드 처리를 독립 페이지로 대체한다.

---

## Technical Context

- React + TypeScript 기반 어드민 프론트엔드
- 페이지: `frontend/src/pages/admin/Settlement/SettlementListPage.tsx`
- API 모듈: `frontend/src/api/admin/settlementApi.ts`
- 백엔드 도메인: `admin/settlement` (settlement_reports / settlement_items)
- API 계약: `specs/frontend/admin/settlement/api-schema.md`
- 권한: MASTER 전용 (`adminRole === 'MASTER'` 기준 사이드바 메뉴 제어)

---

## Component Structure

```text
SettlementListPage
├── 상태 필터 (전체 / PENDING / CONFIRMED)
├── "정산 생성" 버튼
├── 정산 목록 테이블
│   └── 행: 정산기간·총매출·총환불·순매출·거래건수·상태
│       - 상태배지: PENDING(노란색) / CONFIRMED(초록색)
│       - 행 클릭 → 상세 페이지 이동
├── 페이지네이션
├── GenerateModal (수동 생성)
│   ├── 시작일 / 종료일 DatePicker
│   └── "생성" 버튼 (시작일 >= 종료일 시 비활성)
│
SettlementDetailPage
├── 정산 요약 카드
│   ├── 기간·총매출·총환불·순매출·공급가액·부가세
│   └── 확정자·확정일·메모 (CONFIRMED 건)
├── 포함 항목 목록 테이블
│   └── 행: 결제ID·주문번호·회원명·상품명·금액·유형(PAYMENT/REFUND)·결제승인일
├── "정산 확정" 버튼 (PENDING 건만 노출)
└── ConfirmModal (확정 확인)
    ├── 메모 입력 (선택)
    └── "확정" / "취소" 버튼
```

---

## Phases

- [ ] Phase 1: 타입 & 상수 정의 — SettlementStatus, SettlementItemType, 인터페이스, 상수
- [ ] Phase 2: 정산 목록 페이지 — 필터, 테이블, 페이지네이션, 상태배지
- [ ] Phase 3: 수동 생성 — GenerateModal, 기간 입력, 유효성 검증
- [ ] Phase 4: 정산 상세 페이지 — 요약 카드, 항목 목록, 확정 버튼
- [ ] Phase 5: 정산 확정 — ConfirmModal, 메모 입력, 서버 응답 기준 상태 갱신
- [ ] Phase 6: API 연동 — settlementApi.ts 작성, 더미 데이터 제거
- [ ] Phase 7: 사이드바 권한 — MASTER 역할 조건 메뉴 노출

---

## Data Flow

1. 목록 페이지 마운트 → `GET /api/v1/admin/settlements` 호출.
2. 상태 필터 변경 → 검색 버튼(또는 필터 직접 적용) → fetch 재호출.
3. 수동 생성 → `POST /api/v1/admin/settlements/generate` → 성공 시 목록 재조회.
4. 행 클릭 → 상세 페이지 이동 → `GET /api/v1/admin/settlements/{id}` 호출.
5. 정산 확정 → `PATCH /api/v1/admin/settlements/{id}/confirm` → 서버 응답 기준 상태 갱신.

---

## State Ownership

| 상태 | 소유 위치 |
|---|---|
| 정산 목록 (`settlements`) | `SettlementListPage` |
| 상태 필터 | `SettlementListPage` (로컬) |
| 정산 상세 (`detail`) | `SettlementDetailPage` |
| 생성 모달 상태 | `SettlementListPage` |
| 확정 모달 상태 | `SettlementDetailPage` |

---

## Risks

- **BE 미완성**: 백엔드 정산 API 구현 전까지 더미 데이터 또는 목업 필요.
- **금액 정합성**: BIGINT 금액을 JS number로 처리 — KRW 단위에서는 안전 범위 내이나, 포맷팅 시 주의.
- **사이드바 권한 제어**: 기존 사이드바 컴포넌트에 `adminRole` 기반 조건 분기 추가 필요 — 기존 패턴 확인 후 적용.
