# Tasks: 관리자 AI 매트릭스

## Phase 1 - API 계약 및 타입 정리

**Branch**: `feature/admin-ai-metrics-api`  
**Base**: `develop`

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

- [x] 헤비 유저 테이블 API 데이터로 전환
- [x] 사용자 식별자 마스킹 표시 확인
- [x] AI 운영 로그 콘솔 API 데이터로 전환
- [x] AI 운영 로그 콘솔에 최근 로그 5건 기본 조회 적용
- [x] 로그에 프롬프트 원문과 개인정보가 표시되지 않도록 확인
- [x] RAG 지식 베이스 인덱싱 상태 조회 영역 연결

## Phase 5 - 검증 및 마감

**Branch**: `feature/admin-ai-metrics-verify`  
**Base**: `feature/admin-ai-metrics-logs-anomaly`

- [x] 관리자 권한이 없는 사용자의 접근 제한 확인
- [x] `accessToken` JWT payload에서 `ROLE_ADMIN` 권한을 확인하도록 라우트 가드 보강
- [x] API 실패, 빈 데이터, 권한 오류 상태 확인
- [x] 모델 표시명이 없을 때 실제 모델명을 대체 표시하는지 확인
- [x] 실제 모델명이 바뀌어도 도메인별 통계가 유지되는지 확인
- [x] 모바일과 데스크톱에서 카드, 차트, 테이블 레이아웃 확인
- [x] `npm run build` 또는 프로젝트에서 가능한 검증 명령 실행

## Phase 6 - RAG 문서 관리 보강

**Branch**: `feature/admin-ai-metrics-rag-documents`  
**Base**: `feature/admin-ai-metrics-verify`

- [ ] `POST /api/v1/admin/ai-metrics/rag-documents` 문서 업로드 API 연동
- [ ] `GET /api/v1/admin/ai-metrics/rag-documents/{documentId}/download` 문서 다운로드 API 연동
- [ ] `DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}` 문서 삭제 API 연동
- [ ] 업로드 파일 형식, 크기, 필수값 검증 상태 처리
- [ ] 업로드 후 RAG 인덱싱 상태(`INDEXING`, `SYNCED`, `FAILED`) 갱신 흐름 확인
- [ ] 삭제 요청 후 목록/상태 갱신 및 `DELETING` 상태 표시 여부 확인
- [ ] 업로드/다운로드/삭제 실패 시 관리자 화면 오류 메시지 처리
