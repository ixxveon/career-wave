# Plan: 서비스 통계 및 분석 (Statistics)

**Feature Branch**: `feature/admin-statistics-fe-spec`
**담당**: 신보라
**버전**: v1
**상태**: UI 구현 완료 / API 연동 예정

---

## Summary

서비스 매출 현황과 가입자 증가 추이를 확인하는 어드민 통계 페이지.
단일 페이지 구조로 KPI·차트·피드를 모두 표시하며, SVG 직접 구현 차트를 사용한다.
모든 데이터는 현재 더미 상수로 구성되어 있으며, API 연동 시 `statsApi.ts`로 교체한다.

---

## Technical Context

- React + TypeScript 기반 어드민 프론트엔드
- 대상 컴포넌트: `frontend/src/admin/pages/Statistics/StatisticsPage.tsx`
- 스타일: `frontend/src/admin/styles/Statistics.css`
- API 모듈: `frontend/src/admin/api/statsApi.ts` (연동 시 생성)
- API 계약: `specs/frontend/admin/007-statistics/api-schema.md`

---

## Component Structure

```text
StatisticsPage
├── KpiCard × 4
│   ├── 이번 달 매출 (전월 대비 증감률)
│   ├── 누적 총 매출
│   ├── 총 가입자 수
│   └── 이번 달 신규 가입 (전월 대비 증감률)
│
├── Row 1
│   ├── 월별 매출 추이 (SVG 꺾은선 차트, 최근 6개월, 피크 툴팁)
│   └── 구독 유형별 매출 실적 (테이블 리스트)
│       └── 프리미엄 월정액 / 신규 가입 전환 / 갱신 결제 / 환불 차감
│
└── Row 2
    ├── 구독자 변동 추이 (SVG 이중 꺾은선 차트, 신규 vs 탈퇴, 최근 6개월)
    └── 최근 가입 피드 (최대 5건)
        └── 아바타 / 이름 / 상태 배지 / 플랜 / 경과 시간
```

---

## Phases

- [x] Phase 1: 더미 데이터 및 타입 정의
- [x] Phase 2: KPI 카드 4종 구현
- [x] Phase 3: 월별 매출 추이 SVG 차트 구현
- [x] Phase 4: 구독 유형별 매출 실적 테이블 구현
- [x] Phase 5: 구독자 변동 추이 SVG 이중 꺾은선 구현
- [x] Phase 6: 최근 가입 피드 구현
- [ ] Phase 7: API 연동 — `statsApi.ts` 작성 및 더미 데이터 교체

---

## Data Flow

1. 페이지 마운트 시 5개 API를 병렬 호출한다 (summary, revenue/monthly, revenue/breakdown, subscribers/monthly, subscribers/recent).
2. 각 API 응답은 독립적으로 해당 섹션 상태를 갱신한다.
3. SVG 차트의 데이터 소스와 X축 레이블을 API 응답으로 교체한다.
4. 별도 필터·검색 없음 → 마운트 시 1회 로드, 새로고침 시 재로드.

---

## State Ownership

| 상태 | 소유 위치 |
|---|---|
| KPI 집계 | `StatisticsPage` |
| 월별 매출 추이 | `StatisticsPage` |
| 구독 유형별 매출 | `StatisticsPage` |
| 구독자 변동 추이 | `StatisticsPage` |
| 최근 가입 피드 | `StatisticsPage` |

---

## Risks

- **SVG 차트 데이터 교체**: X축 레이블을 API 응답 `month` 필드로 교체 시 기존 SVG 좌표 계산 로직 수정 필요.
- **누락 월 0 채움**: 신규 서비스 특성상 일부 월 데이터 없을 수 있음 → BE에서 0으로 채워 반환 (프론트에서 가정 금지).
- **BE 미완성**: API 연동 전까지 더미 상수 유지, `statsApi.ts` 구조만 완성하여 전환 대비.
- **병렬 호출 실패**: 5개 중 일부 실패 시 나머지는 정상 표시, 실패 섹션만 에러 표시.
