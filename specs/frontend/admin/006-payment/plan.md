# Plan: 결제·정산 관리 (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-ui`
**담당**: 신보라
**버전**: v1
**상태**: UI 구현 완료 / API 연동 예정

---

## Summary

프리미엄 구독 결제 내역 조회, 환불 처리, 구독 현황 관리를 담당하는 어드민 페이지.
3-탭 구조(결제 내역 / 구독 현황 / 정산 리포트)로 구성하며,
정산 리포트 탭은 v1에서 블라인드 처리, v2에서 구현 예정.
멘토 정산 기능 없음.

---

## Technical Context

- React + TypeScript 기반 어드민 프론트엔드
- 대상 컴포넌트: `frontend/src/admin/pages/Payment/PaymentPage.tsx`
- 스타일: `frontend/src/admin/styles/Payment.css`
- API 모듈: `frontend/src/admin/api/paymentApi.ts`
- 백엔드 도메인: `admin/payment` (payments / refunds / subscriptions)
- API 계약: `specs/frontend/admin/006-payment/api-schema.md`

---

## Component Structure

```text
PaymentPage
├── TabBar (결제 내역 | 구독 현황 | 정산 리포트)
│
├── [결제 내역 탭]
│   ├── KpiCard × 4 (이번달 총 매출 / 결제 건수 / 환불 요청 / 결제 실패)
│   ├── 필터 (키워드 검색 / 상품 필터 / 상태 필터)
│   ├── 결제 목록 테이블
│   │   └── 행: 결제ID·Toss주문번호·회원명·상품명·유형·결제일·금액·상태·관리
│   │       - 상태배지: refundStatus 있으면 환불 상태 우선 표시
│   │       - 관리버튼: PENDING 환불 건 → "환불 처리", 나머지 → "상세보기"
│   └── PaymentDetailModal (결제 상세 / 환불 처리 겸용)
│       ├── 결제 정보 (상품명·결제일·금액·유형·결제상태·환불상태)
│       ├── 환불 가능 여부 확인 섹션 (refundStatus=PENDING 건만 노출)
│       │   ├── 결제 경과일 (N일 경과, 7일 이내/초과)
│       │   ├── 이력서 분석 유료 이용 횟수
│       │   ├── AI 면접 유료 이용 횟수
│       │   └── 환불 가능/불가 배지
│       └── 액션 버튼
│           ├── "환불 처리 확정" (조건 충족 시)
│           └── "환불 불가 처리" (조건 미충족 시)
│
├── [구독 현황 탭]
│   ├── KpiCard × 4 (활성 / 갱신예정(D-7) / 취소예정 / 이탈위험)
│   ├── 상태 필터 드롭다운
│   └── 구독 목록 테이블
│       └── 행: ID·회원명·구독플랜·시작일·다음갱신일·상태
│
└── [정산 리포트 탭]
    └── v2 블라인드 안내 화면 ("다음 버전에 구현 될 예정입니다.")
```

---

## Phases

- [x] Phase 1: 공통 구조 — 탭 레이아웃, 타입/상수/더미 데이터 정의
- [x] Phase 2: 결제 내역 탭 — KPI 카드, 필터, 목록 테이블, 상세/환불 모달
- [x] Phase 3: 구독 현황 탭 — KPI 카드, 상태 필터, 목록 테이블
- [x] Phase 4: 정산 리포트 탭 — v2 블라인드 처리
- [ ] Phase 5: API 연동 — `paymentApi.ts` 작성 및 더미 데이터 제거
