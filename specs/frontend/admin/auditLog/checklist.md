# Checklist: 관리자 감사 로그

## Spec 검증

- [ ] 관리자 감사 로그 API base path는 `/api/v1/admin/audit-logs`로 통일되어 있다.
- [ ] 관리자 감사 로그 API는 `ApiResponse<T>` 응답 구조를 따른다.
- [ ] source 값은 `ADMIN`, `AI`, `SCRAPING`으로 통일되어 있다.
- [ ] level 값은 `INFO`, `WARN`, `ERROR`, `SUCCESS`로 통일되어 있다.
- [ ] 프론트엔드는 감사 로그를 수정하거나 삭제하지 않는다.
- [ ] 로그 상세에는 민감 정보가 노출되지 않는다고 명시되어 있다.

## Phase 1 - API 계약 및 타입 정리

- [ ] `frontend/src/admin/api/auditLogApi.ts` 생성
- [ ] `AuditLogSource`, `AuditLogLevel` 타입 정의
- [ ] `AuditLogSummary`, `AuditLogItem`, `AuditLogDetail` 타입 정의 및 export
- [ ] `GET /api/v1/admin/audit-logs/summary` 호출 함수 작성
- [ ] `GET /api/v1/admin/audit-logs` 호출 함수 작성
- [ ] `GET /api/v1/admin/audit-logs/{logId}` 호출 함수 작성
- [ ] `ApiResponse<T>`와 페이지네이션 응답 구조 처리
- [ ] 페이지에서 직접 API 호출하지 않도록 API 계층 경계 정의

## Phase 2 - 요약과 목록 데이터 연동

- [ ] 요약 카드를 API 데이터로 렌더링
- [ ] 감사 로그 목록을 API 데이터로 렌더링
- [ ] source 탭 조건을 API 조회 조건과 동기화
- [ ] level 필터 조건을 API 조회 조건과 동기화
- [ ] keyword 검색 조건을 API 조회 조건과 동기화
- [ ] 페이지네이션 UI와 API 응답 메타데이터 연결
- [ ] 로딩, 빈 데이터, API 실패 상태 처리

## Phase 3 - 상세 조회와 선택 상태

- [ ] 로그 행 선택 시 상세 API 호출
- [ ] 상세 패널을 API 데이터로 렌더링
- [ ] 필터 변경 시 선택 로그 상태 정리
- [ ] 상세 조회 로딩 상태 표시
- [ ] 상세 조회 실패 상태 표시
- [ ] 상세 데이터 없음 상태 표시

## Phase 4 - 상태 처리와 보안 검증

- [ ] 401 인증 만료 상태 처리
- [ ] 403 관리자 권한 오류 상태 처리
- [ ] 검색 결과 없음과 전체 빈 목록 상태 구분
- [ ] 기간 필터 유효성 검증
- [ ] 로그 상세에 토큰, 쿠키, 비밀번호, 개인정보, 프롬프트 원문, 외부 응답 전문이 표시되지 않도록 확인
- [ ] 프론트엔드에서 로그 수정/삭제 액션이 제공되지 않는지 확인

## Phase 5 - 검증 및 마감

- [ ] `/admin/log` 진입 시 요약 카드와 로그 목록 표시 확인
- [ ] source, level, keyword, page 변경이 API 조회 조건과 일치하는지 확인
- [ ] 로그 선택 시 상세 패널 갱신 확인
- [ ] API 실패, 빈 목록, 검색 결과 없음, 권한 오류 상태 확인
- [ ] 모바일과 데스크톱에서 테이블, 필터, 상세 패널 레이아웃 확인
- [ ] `npm run build` 또는 프로젝트에서 가능한 프론트엔드 검증 명령 실행
