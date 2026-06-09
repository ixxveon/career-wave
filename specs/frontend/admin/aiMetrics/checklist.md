# Checklist: 관리자 AI 매트릭스

## Spec Consistency

- [x] `spec.md`, `plan.md`, `tasks.md`, `api-schema.md`, `constitution.md`의 도메인 정의가 일치한다.
- [x] 모니터링 도메인은 ERD의 `ai_usage_logs.feature_type` 기준인 `DOCUMENT`, `INTERVIEW`로 통일되어 있고, 관리자 기능 섹션(예: RAG 상태)은 별도 영역으로 구분되어 있다.
- [x] 모델명은 `displayModelName`과 `actualModelName`으로 분리되어 있다.
- [x] 비용은 정산 데이터가 아닌 운영 참고용 추정치로 명시되어 있다.
- [x] Phase별 작업 규칙과 의존성이 문서에 반영되어 있다.

## Phase 1 - API 계약 및 타입 정리

- [x] `frontend/src/api/admin/aiMetricsApi.ts`에서 관리자 AI 매트릭스 API를 관리한다.
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

- [x] 시간대별 입력/출력 토큰 차트가 API 데이터와 일치한다.
- [x] 도메인 필터 변경 후 추이 데이터가 다시 조회된다.
- [x] 월간 예산, 현재 비용, 예상 비용, 임계치가 표시된다.
- [x] 예산 및 임계치 수정 결과가 화면에 반영된다.
- [x] 디스코드 알림 토글 상태 변경이 API와 동기화된다.
- [x] 사용량 제한 제어 상태 변경이 API와 동기화된다.

## Phase 4 - 헤비 유저, 로그, RAG 상태

- [x] 헤비 유저 테이블이 도메인별 이상 사용량을 표시한다.
- [x] 사용자 식별자는 마스킹되거나 내부 식별자로 표시된다.
- [x] AI 운영 로그는 발생 시각, 도메인, 등급, 메시지를 표시한다.
- [x] AI 운영 로그 콘솔은 최근 로그 5건을 기본 조회로 표시한다.
- [x] AI 운영 로그의 도메인/등급 필터와 페이지네이션은 후속 범위로 분리되어 있다.
- [x] 로그에는 프롬프트 원문, 지원자 개인정보, 면접 답변 전문이 노출되지 않는다.
- [x] RAG 지식 베이스 인덱싱 상태가 관리자 AI 기능 영역에 표시된다.

## Phase 5 - 검증 및 마감

- [x] 관리자 JWT의 `ROLE_ADMIN` 기준 접근 제어가 확인된다.
- [x] 실제 모델명이 변경되어도 도메인별 통계가 유지된다.
- [x] `displayModelName`이 있으면 화면 표시명으로 우선 노출된다.
- [x] `displayModelName`이 없으면 MVP 대체 표시가 정상 동작한다.
- [x] 모바일과 데스크톱에서 레이아웃이 깨지지 않는다.
- [x] 가능한 프론트엔드 빌드 또는 검증 명령이 수행된다.

## Phase 6 - RAG 문서 관리 보강

- [x] RAG 문서 업로드 API가 화면에 연결된다.
- [x] RAG 문서 다운로드 API가 화면에 연결된다.
- [x] RAG 문서 삭제 API가 화면에 연결된다.
- [x] 업로드 파일 형식, 크기, 필수값 검증 오류 표시가 구현된다.
- [x] 업로드 후 `INDEXING`, `SYNCED`, `FAILED` 상태 갱신 흐름이 구현된다.
- [x] 삭제 요청 후 목록/상태 갱신과 `DELETING` 상태 표시가 구현된다.
- [x] 업로드/다운로드/삭제 실패 시 관리자 화면 오류 메시지 표시가 구현된다.
- [ ] RAG 문서 업로드 API 연동 수동 검증
- [ ] RAG 문서 다운로드 API 연동 수동 검증
- [ ] RAG 문서 삭제 API 연동 수동 검증
- [ ] 업로드 파일 형식, 크기, 필수값 검증 오류 표시 수동 검증
- [ ] 업로드 후 `INDEXING`, `SYNCED`, `FAILED` 상태 갱신 흐름 수동 검증
- [ ] 삭제 요청 후 목록/상태 갱신과 `DELETING` 상태 표시 수동 검증
- [ ] 업로드/다운로드/삭제 실패 시 관리자 화면 오류 메시지 표시 수동 검증

## Team Convention

- [x] 기본 브랜치 생성 원칙이 최신 `develop` 기준으로 명시되어 있다.
- [x] Phase 의존성 때문에 스택 브랜치가 필요한 경우 그 사유와 흐름이 문서에 명시되어 있다.
- [x] PR은 하나의 Phase 목적만 포함한다.
- [x] PR 본문에는 Phase 범위와 검증 결과를 명시한다.
- [x] 새 라이브러리는 팀 합의 없이 추가하지 않는다.
- [x] 관련 없는 파일 변경은 포함하지 않는다.
