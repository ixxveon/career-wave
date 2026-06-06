# Tasks: 관리자 감사 로그

## Spec 검증

- [x] 관리자 감사 로그 API base path는 `/api/v1/admin/audit-logs`로 통일되어 있다.
- [x] 관리자 감사 로그 API는 `ApiResponse<T>` 응답 구조를 따른다.
- [x] source 값은 `ADMIN`, `AI`, `SCRAPING`으로 통일되어 있다.
- [x] level 값은 `INFO`, `WARN`, `ERROR`, `SUCCESS`로 통일되어 있다.
- [x] 프론트엔드는 감사 로그를 수정하거나 삭제하지 않는다.
- [x] 로그 상세에는 민감 정보가 노출되지 않는다고 명시되어 있다.

## Phase 1 - API 계약 및 타입 정리

**Branch**: `feature/admin-audit-log-api`
**Base**: `docs/admin-audit-log-spec`

- [x] `frontend/src/admin/api/auditLogApi.ts` 생성
- [x] `AuditLogSource`, `AuditLogLevel` 타입 정의
- [x] `AuditLogSummary`, `AuditLogItem`, `AuditLogDetail` 타입 정의 및 export
- [x] `GET /api/v1/admin/audit-logs/summary` 호출 함수 작성
- [x] `GET /api/v1/admin/audit-logs` 호출 함수 작성
- [x] `GET /api/v1/admin/audit-logs/{logId}` 호출 함수 작성
- [x] `ApiResponse<T>`와 페이지네이션 응답 구조 처리
- [x] 현재 감사 로그 페이지에서 `axios` 또는 `fetch`를 직접 호출하지 않는지 확인
- [x] 감사 로그 API 호출 함수를 `auditLogApi` 객체로만 노출하도록 경계 정의
- [x] 페이지에서 직접 API 호출하지 않도록 API 계층 경계 정의
- [x] 현재 감사 로그 UI와 Phase 1 API 계약 tasks 일치 여부 확인

## Phase 2 - 요약과 목록 데이터 연동

**Branch**: `feature/admin-audit-log-list`
**Base**: `feature/admin-audit-log-api`

- [x] 요약 카드를 API 데이터로 렌더링
- [x] 감사 로그 목록을 API 데이터로 렌더링
- [x] source 탭 조건을 API 조회 조건과 동기화
- [x] level 필터 조건을 API 조회 조건과 동기화
- [x] keyword 검색 조건을 API 조회 조건과 동기화
- [x] 스크롤 목록 UI에 맞춰 API page/size 기본 조회 조건 연결
- [x] 로딩, 빈 데이터, API 실패 상태 처리

## Phase 3 - 상세 조회와 선택 상태

**Branch**: `feature/admin-audit-log-detail-filter`
**Base**: `feature/admin-audit-log-list`

- [x] 로그 행 선택 시 상세 API 호출
- [x] 상세 패널을 API 데이터로 렌더링
- [x] 필터 변경 시 선택 로그 상태 정리
- [x] 상세 조회 로딩 상태 표시
- [x] 상세 조회 실패 상태 표시
- [x] 상세 데이터 없음 상태 표시

## Phase 4 - 상태 처리와 보안 검증

**Branch**: `feature/admin-audit-log-state-security`
**Base**: `feature/admin-audit-log-detail-filter`

- [x] 401 인증 만료 상태 처리
- [x] 403 관리자 권한 오류 상태 처리
- [x] 검색 결과 없음과 전체 빈 목록 상태 구분
- [x] 기간 필터 유효성 검증
- [x] 로그 상세에 토큰, 쿠키, 비밀번호, 개인정보, 프롬프트 원문, 외부 응답 전문이 표시되지 않도록 확인
- [x] 프론트엔드에서 로그 수정/삭제 액션이 제공되지 않는지 확인

## Phase 5 - 검증 및 마감

**Branch**: `feature/admin-audit-log-verify`
**Base**: `feature/admin-audit-log-state-security`

- [ ] `/admin/log` 진입 시 요약 카드와 로그 목록 표시 확인
- [ ] source, level, keyword 변경과 기본 page/size 조회 조건이 API 조회 조건과 일치하는지 확인
- [ ] 로그 선택 시 상세 패널 갱신 확인
- [ ] API 실패, 빈 목록, 검색 결과 없음, 권한 오류 상태 확인
- [ ] 모바일과 데스크톱에서 테이블, 필터, 상세 패널 레이아웃 확인
- [ ] `npm run build` 또는 프로젝트에서 가능한 프론트엔드 검증 명령 실행
