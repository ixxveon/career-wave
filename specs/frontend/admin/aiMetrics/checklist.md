# Checklist: 관리자 AI 매트릭스

## Spec Consistency

- [x] `spec.md`, `plan.md`, `tasks.md`, `api-schema.md`, `constitution.md`의 도메인 정의가 일치한다.
- [x] 모니터링 도메인은 ERD의 `ai_usage_logs.feature_type` 기준인 `DOCUMENT`, `INTERVIEW`로 통일되어 있고, 관리자 기능 섹션(예: RAG 상태)은 별도 영역으로 구분되어 있다.
- [x] 모델명은 `displayModelName`과 `actualModelName`으로 분리되어 있다.
- [x] 비용은 정산 데이터가 아닌 운영 참고용 추정치로 명시되어 있다.
- [x] Phase별 스택 브랜치 작업 규칙이 문서에 반영되어 있다.

## Phase 1 - API 계약 및 타입 정리

- [x] `frontend/src/admin/api/aiMetricsApi.ts`에서 관리자 AI 매트릭스 API를 관리한다.
- [x] 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- [x] `ApiResponse<T>` 응답 구조를 기준으로 처리한다.
- [x] `AiDomain`, `AiEventSeverity`, `AiHealthStatus`, `AiUsageRiskLevel` 타입이 정의되어 있다.
- [x] `AiMetricSummary`, `AiDomainUsage`, `AiTokenTrendPoint`, `AiHeavyUser`, `AiMetricLog`, `AiBudgetSetting` 응답 타입이 정의되어 있다.
- [x] TypeScript interface는 PascalCase를 사용하고 `I` prefix를 사용하지 않는다.
- [x] 모델 표시명과 실제 모델명 필드가 모두 수용된다.

## Phase 2 - 도메인별 사용량 대시보드

- [x] AI 서류 기능, AI 면접 기능 카드가 표시된다.
- [x] 요청 수, 성공/실패 수, 실패율, 평균 응답 시간이 표시된다.
- [x] 입력/출력 토큰과 비용 추정치가 도메인별로 표시된다.
- [x] 도메인 위험도 상태가 명확히 구분된다.
- [x] 로딩, 빈 데이터, API 실패 상태가 화면에 표시된다.

## Phase 3 - 토큰, 비용, 예산, 알림

- [ ] 시간대별 입력/출력 토큰 차트가 API 데이터와 일치한다.
- [ ] 도메인 필터 변경 시 추이 데이터가 다시 조회된다.
- [ ] 월간 예산, 현재 비용, 예상 비용, 임계치가 표시된다.
- [ ] 예산 및 임계치 수정 결과가 화면에 반영된다.
- [ ] 디스코드 알림 토글 상태 변경이 API와 동기화된다.
- [ ] 사용량 제한 제어 상태 변경이 API와 동기화된다.

## Phase 4 - 헤비 유저, 로그, RAG 상태

- [ ] 헤비 유저 테이블이 도메인별 이상 사용량을 표시한다.
- [ ] 사용자 식별자는 마스킹 또는 내부 식별자로 표시된다.
- [ ] AI 운영 로그는 발생 시각, 도메인, 등급, 메시지를 표시한다.
- [ ] AI 운영 로그는 도메인/등급 필터와 페이지네이션을 적용한다.
- [ ] 로그에는 프롬프트 원문, 지원자 개인정보, 면접 답변 전문이 노출되지 않는다.
- [ ] RAG 지식 베이스 인덱싱 상태가 관리자 AI 기능 영역에 표시된다.

## Phase 5 - 검증 및 마감

- [ ] 관리자 JWT와 `ROLE_ADMIN` 권한 기준 접근 제어가 확인된다.
- [ ] 실제 모델명이 변경되어도 도메인별 통계가 유지된다.
- [ ] `displayModelName`이 있으면 화면 표시명으로 우선 노출된다.
- [ ] `displayModelName`이 없으면 MVP 대체 표시가 정상 동작한다.
- [ ] 모바일과 데스크톱에서 레이아웃이 깨지지 않는다.
- [ ] 가능한 프론트엔드 빌드 또는 검증 명령이 수행된다.

## Team Convention

- [x] 최신 `develop` 기준 브랜치 생성 원칙을 확인했다.
- [x] 스택 브랜치가 필요한 Phase 의존성을 문서에 명시했다.
- [x] PR은 하나의 Phase 목적만 포함한다.
- [x] PR 본문에는 Phase 범위와 검증 결과를 명시한다.
- [x] 새 라이브러리는 팀 합의 없이 추가하지 않는다.
- [x] 관련 없는 파일 변경은 포함하지 않는다.
