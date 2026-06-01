# Implementation Plan: 관리자 AI 매트릭스

## Summary

관리자 AI 매트릭스 화면을 도메인별 AI 사용량 모니터링 중심으로 구현한다. MVP는 AI 서류 기능, AI 면접 기능, 관리자 AI 기능의 요청 수, 토큰, 비용 추정치, 실패율, 헤비 유저, 운영 로그를 조회하고 위험 상태를 표시한다.

## Technical Context

- Frontend: React + Vite + TypeScript
- Page: `frontend/src/admin/pages/AiMetrics/AiMetricsPage.tsx`
- API Module: `frontend/src/admin/api/aiMetricsApi.ts`
- Server State: TanStack Query 우선
- Auth: 관리자 JWT, `ROLE_ADMIN`
- Response: `ApiResponse<T>`

## Project Structure

```text
frontend/src/admin/
├── api/
│   └── aiMetricsApi.ts
├── pages/
│   └── AiMetrics/
│       └── AiMetricsPage.tsx
└── components/
    └── MiniPagination.tsx

specs/frontend/admin/aiMetrics/
├── api-schema.md
├── checklist.md
├── constitution.md
├── plan.md
├── spec.md
└── tasks.md
```

## Branch Strategy

기본 팀 규칙은 최신 `develop`에서 기능 브랜치를 생성하는 것이다. 이 작업은 Phase별 산출물이 다음 Phase의 기반이 되므로 팀 합의가 있는 경우 아래 스택 브랜치 전략을 사용한다.

| Phase | Branch | Base |
|-------|--------|------|
| Spec | `feature/admin-ai-metrics-spec` | `develop` |
| Phase 1 | `feature/admin-ai-metrics-api` | `feature/admin-ai-metrics-spec` |
| Phase 2 | `feature/admin-ai-metrics-domain-usage` | `feature/admin-ai-metrics-api` |
| Phase 3 | `feature/admin-ai-metrics-cost-alert` | `feature/admin-ai-metrics-domain-usage` |
| Phase 4 | `feature/admin-ai-metrics-logs-anomaly` | `feature/admin-ai-metrics-cost-alert` |
| Phase 5 | `feature/admin-ai-metrics-verify` | `feature/admin-ai-metrics-logs-anomaly` |

이전 Phase PR이 병합되면 다음 Phase 브랜치는 병합된 최신 base에 맞춰 rebase 또는 base 변경을 진행한다.

## Phases

### Phase 1 - API 계약 및 타입 정리

- `frontend/src/admin/api/aiMetricsApi.ts`를 생성한다.
- `AiDomain`, `AiDomainUsage`, `AiMetricSummary`, `AiTokenTrendPoint`, `AiMetricLog` 타입을 정의한다.
- `displayModelName`과 `actualModelName`을 분리한 응답 타입을 사용한다.
- 페이지에서 mock 데이터와 직접 상태 관리에 의존하던 부분을 API 연결 가능한 구조로 정리한다.

### Phase 2 - 도메인별 사용량 대시보드

- AI 서류 기능, AI 면접 기능, 관리자 AI 기능 카드를 구성한다.
- 기존 모델 중심 UI를 도메인 중심 필터와 요약 카드로 재배치한다.
- 로딩, 빈 데이터, 실패 상태를 화면에 반영한다.

### Phase 3 - 토큰, 비용, 예산, 알림

- 시간대별 입력/출력 토큰 차트를 API 데이터 기반으로 전환한다.
- 월간 예산, 현재 비용, 예상 비용, 임계치 상태를 연결한다.
- 디스코드 알림과 사용량 제한 제어를 API로 연결한다.

### Phase 4 - 헤비 유저, 로그, RAG 상태

- 헤비 유저 테이블을 도메인 기준으로 조회한다.
- 운영 로그 콘솔을 도메인/등급 필터와 페이지네이션 기준으로 정리한다.
- 관리자 AI 기능에 포함된 RAG 지식 베이스 인덱싱 상태를 조회한다.

### Phase 5 - 검증 및 마감

- 권한 오류, API 실패, 빈 데이터, 긴 조회 기간을 검증한다.
- 민감 정보가 화면에 노출되지 않는지 확인한다.
- 모바일과 데스크톱에서 카드, 차트, 테이블 레이아웃을 확인한다.
- `npm run build` 또는 프로젝트에서 가능한 프론트엔드 검증 명령을 실행한다.

## Convention Alignment

- 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 관리자 API는 `frontend/src/admin/api` 하위로 분리한다.
- TypeScript interface는 PascalCase를 사용하고 `I` prefix를 사용하지 않는다.
- 새 라이브러리는 팀 합의 없이 추가하지 않는다.
- 관리자 API는 JWT와 `ROLE_ADMIN` 권한을 전제로 설계한다.
