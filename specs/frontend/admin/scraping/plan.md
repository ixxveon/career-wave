# Implementation Plan: 관리자 스크래핑 관리

## Summary

관리자 스크래핑 관리 화면을 API 기반 운영 모니터링 화면으로 전환한다. MVP는 source 목록 조회, 검색/최근 실행 결과 필터, 페이지네이션, 단일 액션 요청, 운영 로그 조회를 포함한다.

## Technical Context

- Frontend: React + Vite + TypeScript
- Page: `frontend/src/admin/pages/Scraping/ScrapingPage.tsx`
- API Module: `frontend/src/admin/api/scrapingApi.ts`
- Server State: TanStack Query 우선
- Auth: 관리자 JWT, `ROLE_ADMIN` 백엔드 역할 검증 필요
- Response: `ApiResponse<T>`
- Related Runtime: FastAPI scraping runner 또는 backend batch orchestration
- ERD Alignment: `scraping_logs.scraping_status` 기준 `SUCCESS`, `FAILED`만 API 상태값으로 사용

## Project Structure

```text
frontend/src/admin/
├── api/
│   └── scrapingApi.ts
├── pages/
│   └── Scraping/
│       └── ScrapingPage.tsx
└── components/
    └── MiniPagination.tsx

specs/frontend/admin/scraping/
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
| Spec | `feature/admin-scraping-spec` | `develop` |
| Phase 1 | `feature/admin-scraping-api` | `feature/admin-scraping-spec` |
| Phase 2 | `feature/admin-scraping-list` | `feature/admin-scraping-api` |
| Phase 3 | `feature/admin-scraping-actions` | `feature/admin-scraping-list` |
| Phase 4 | `feature/admin-scraping-logs` | `feature/admin-scraping-actions` |
| Phase 5 | `feature/admin-scraping-verify` | `feature/admin-scraping-logs` |

이전 Phase PR이 병합되면 다음 Phase 브랜치는 병합된 최신 base에 맞춰 rebase 또는 base 변경을 진행한다.

## Phases

### Backend Preconditions

- `backend/src/main/java/kr/co/carrer/global/config/SecurityConfig.java` 또는 동등한 보안 설정에서 관리자 스크래핑 엔드포인트에 역할 기반 접근 제어를 적용해야 한다.
- 단순 JWT 인증만으로는 충분하지 않으며, `/api/admin/scraping/**`는 `hasRole("ADMIN")`, `hasAuthority("ROLE_ADMIN")` 또는 프로젝트 표준에 맞는 동등한 방식으로 보호되어야 한다.
- 역할 검증이 확정되기 전까지 프론트엔드는 API 연동 시 403 응답 처리를 구현하되, 접근 제어가 완료되었다고 가정하지 않는다.

### Phase 1 - API 계약 및 타입 정리

- `frontend/src/admin/api/scrapingApi.ts`를 생성한다.
- `ScrapingStatus`, `ScrapingActionType` 타입을 정의한다.
- 목록, 요약, 상세, 액션, 로그 응답 타입을 정의한다.
- `ApiResponse<T>` 응답 구조에 맞춰 API 함수 계약을 정리한다.

### Phase 2 - source 목록, 검색, 필터

- mock 기반 source 목록을 API 데이터 기반으로 전환한다.
- source명과 최근 오류 검색 조건을 API 조회 조건으로 연결한다.
- 실행 결과 필터와 페이지네이션을 API 조회 조건으로 연결한다.
- 로딩, 빈 데이터, 실패 상태를 화면에 반영한다.

### Phase 3 - source 실행 액션

- 단일 source 실행, 재시도, 테스트 액션을 API로 연결한다.
- 액션 요청 중 중복 클릭을 방지한다.
- 액션 성공 후 목록 또는 상세 데이터를 갱신한다.
- 액션 실패 시 기존 상태를 유지하고 오류 안내를 표시한다.

### Phase 4 - 운영 로그와 장애 원인 확인

- 실시간 로그 영역을 API 데이터 기반으로 전환한다.
- 로그 상태, source, 페이지 조건을 API 조회 조건으로 연결한다.
- 로그 상세에서 민감 정보가 노출되지 않는지 확인한다.
- 실패 source의 최근 오류와 로그가 연결되어 보이도록 구성한다.

### Phase 5 - 검증 및 마감

- 관리자 권한 오류, API 실패, 빈 목록, 검색 결과 없음, 액션 실패 상태를 검증한다.
- 모바일과 데스크톱에서 테이블, 필터, 로그 콘솔 레이아웃을 확인한다.
- `npm run build` 또는 프로젝트에서 가능한 프론트엔드 검증 명령을 실행한다.

## Convention Alignment

- 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 관리자 API는 `frontend/src/admin/api` 하위로 분리한다.
- TypeScript interface는 PascalCase를 사용하고 `I` prefix를 사용하지 않는다.
- 새 라이브러리는 팀 합의 없이 추가하지 않는다.
- 관리자 API는 JWT 인증과 백엔드 `ROLE_ADMIN` 역할 검증 구현을 선행 조건으로 설계한다.
