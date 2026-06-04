# Implementation Plan: 관리자 감사 로그

## Summary

관리자 감사 로그 화면을 mock seed 기반 통합 로그 화면에서 API 기반 감사 로그 조회 화면으로 전환한다. MVP는 감사 로그 요약 카운트, source/level/keyword/기간 필터, 페이지네이션, 선택 로그 상세, 권한 오류와 민감 정보 노출 방지 검증을 포함한다.

## Technical Context

- Frontend: React + Vite + TypeScript
- Page: `frontend/src/admin/pages/AuditLog/AuditLogPage.tsx`
- Route: `/admin/log`
- API Module: `frontend/src/admin/api/auditLogApi.ts`
- Server State: TanStack Query 우선
- Auth: 관리자 JWT, `ROLE_ADMIN`
- Response: `ApiResponse<T>`

## Project Structure

```text
frontend/src/admin/
├── api/
│   └── auditLogApi.ts
├── pages/
│   └── AuditLog/
│       └── AuditLogPage.tsx
└── components/
    └── MiniPagination.tsx

specs/frontend/admin/auditLog/
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
| Spec | `docs/admin-audit-log-spec` | `develop` |
| Phase 1 | `feature/admin-audit-log-api` | `docs/admin-audit-log-spec` |
| Phase 2 | `feature/admin-audit-log-list` | `feature/admin-audit-log-api` |
| Phase 3 | `feature/admin-audit-log-detail-filter` | `feature/admin-audit-log-list` |
| Phase 4 | `feature/admin-audit-log-state-security` | `feature/admin-audit-log-detail-filter` |
| Phase 5 | `feature/admin-audit-log-verify` | `feature/admin-audit-log-state-security` |

이전 Phase PR이 병합되면 다음 Phase 브랜치는 병합된 최신 base에 맞춰 rebase 또는 base 변경을 진행한다.

## Phases

### Phase 1 - API 계약 및 타입 정리

- `frontend/src/admin/api/auditLogApi.ts`를 생성한다.
- `AuditLogSource`, `AuditLogLevel`, `AuditLogSummary`, `AuditLogItem`, `AuditLogDetail` 타입을 정의한다.
- `ApiResponse<T>`와 페이지네이션 응답 구조를 처리한다.
- 페이지에서 mock seed를 직접 참조하지 않도록 API 계층 경계를 만든다.

### Phase 2 - 목록과 요약 데이터 연동

- 요약 카드 4개를 API 데이터 기반으로 전환한다.
- 감사 로그 목록을 API 데이터로 렌더링한다.
- source 탭, level 필터, keyword 검색 조건을 API 조회 조건과 동기화한다.
- 페이지네이션 UI를 API 응답 메타데이터와 연결한다.

### Phase 3 - 상세 조회와 선택 상태

- 로그 행 선택 시 상세 API를 호출한다.
- 목록 필터 변경 시 선택 로그를 현재 결과의 첫 항목 또는 빈 상태로 정리한다.
- 상세 패널에 발생 시각, source, 등급, 요약, 마스킹된 IP, requestId를 표시한다.
- 상세 데이터가 없는 경우와 상세 조회 실패 상태를 구분한다.

### Phase 4 - 상태 처리와 보안 검증

- 로딩, 빈 데이터, 검색 결과 없음, API 실패, 401/403 권한 오류 상태를 표시한다.
- 로그 상세에 민감 정보가 노출되지 않도록 표시 필드를 제한한다.
- 프론트엔드에서 로그 수정/삭제 액션을 제공하지 않는다.
- 관리자 권한이 없는 경우 접근 제한 흐름을 확인한다.

### Phase 5 - 검증 및 마감

- `/admin/log` 진입 시 요약 카드와 로그 목록이 표시되는지 확인한다.
- 필터, 검색, 페이지 변경이 API 조회 조건과 일치하는지 확인한다.
- 모바일과 데스크톱에서 테이블, 필터, 상세 패널 레이아웃을 확인한다.
- `npm run build` 또는 프로젝트에서 가능한 프론트엔드 검증 명령을 실행한다.

## Convention Alignment

- 관리자 API base path는 `/api/v1/admin/audit-logs`를 사용한다.
- 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 관리자 API는 `frontend/src/admin/api` 하위로 분리한다.
- TypeScript interface는 PascalCase를 사용하고 `I` prefix를 사용하지 않는다.
- 새 라이브러리는 팀 합의 없이 추가하지 않는다.
- 관리자 API는 JWT와 `ROLE_ADMIN` 권한을 전제로 설계한다.

