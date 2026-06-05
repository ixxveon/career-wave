# Tasks: 관리자 AI 매트릭스

## Phase 1 - API 계약 및 타입 정리

**Branch**: `feature/admin-ai-metrics-api`
**Base**: `develop` (원래 `feature/admin-ai-metrics-spec` 예정이었으나 브랜치 정리로 `develop` 기준으로 변경됨)

- [x] `frontend/src/admin/api/aiMetricsApi.ts` 생성
- [x] `AiDomain`, `AiEventSeverity`, `AiHealthStatus`, `AiUsageRiskLevel` 타입 정의
- [x] `AiMetricSummary`, `AiDomainUsage`, `AiTokenTrendPoint`, `AiHeavyUser`, `AiMetricLog`, `AiBudgetSetting` 응답 타입 정의
- [x] `displayModelName`과 `actualModelName`을 분리해 타입에 반영
- [x] `ApiResponse<T>` 응답 구조에 맞춘 API 함수 작성

## Phase 2 - 도메인별 사용량 대시보드

**Branch**: `feature/admin-ai-metrics-domain-usage`
**Base**: `feature/admin-ai-metrics-api`

- [x] `DOCUMENT`, `INTERVIEW` 도메인 카드 렌더링
- [x] 전체 요청 수, 성공/실패 수, 실패율, 평균 응답 시간 표시
- [x] 도메인별 입력/출력 토큰과 비용 추정치 표시
- [x] 도메인 위험도 `NORMAL`, `WARNING`, `CRITICAL` 표시
- [x] 로딩, 빈 데이터, API 실패 상태 처리

## Phase 3 - 토큰, 비용, 예산, 알림

**Branch**: `feature/admin-ai-metrics-cost-alert`
**Base**: `feature/admin-ai-metrics-domain-usage`

- [x] 시간대별 입력/출력 토큰 차트를 API 데이터로 전환
- [x] 도메인 필터 변경 시 토큰 추이 재조회
- [x] 월간 예산, 현재 비용, 예상 비용, 임계치 표시
- [x] 예산 및 임계치 수정 API 연결
- [x] 디스코드 알림 토글 API 연결
- [x] 사용량 제한 제어 API 연결

## Phase 4 - 헤비 유저, 로그, RAG 상태

**Branch**: `feature/admin-ai-metrics-logs-anomaly`
**Base**: `feature/admin-ai-metrics-cost-alert`

- [ ] 헤비 유저 테이블 API 데이터로 전환
- [ ] 사용자 식별자 마스킹 표시 확인
- [ ] AI 운영 로그 콘솔 API 데이터로 전환
- [ ] 로그 도메인/등급 필터와 페이지네이션 적용
- [ ] 로그에 프롬프트 원문과 개인정보가 표시되지 않도록 확인
- [ ] RAG 지식 베이스 인덱싱 상태 조회 영역 연결

## Phase 5 - 검증 및 마감

**Branch**: `feature/admin-ai-metrics-verify`
**Base**: `feature/admin-ai-metrics-logs-anomaly`

- [ ] 관리자 권한이 없는 사용자의 접근 제한 확인
- [ ] API 실패, 빈 데이터, 권한 오류 상태 확인
- [ ] 모델 표시명이 없을 때 실제 모델명을 대체 표시하는지 확인
- [ ] 실제 모델명이 바뀌어도 도메인별 통계가 유지되는지 확인
- [ ] 모바일과 데스크톱에서 카드, 차트, 테이블 레이아웃 확인
- [ ] `npm run build` 또는 프로젝트에서 가능한 검증 명령 실행

## PR 운영 규칙

- [ ] 각 Phase는 별도 PR로 올린다.
- [ ] 후속 Phase 브랜치는 직전 Phase 최신 커밋에서 생성한다.
- [ ] 이전 Phase PR 병합 후 후속 브랜치 base를 최신 상태로 정리한다.
- [ ] PR 본문에는 Phase 범위와 검증 결과를 명시한다.
