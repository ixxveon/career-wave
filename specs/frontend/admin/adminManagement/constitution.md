# Constitution: 관리자 관리

**Feature Branch**: `feature/admin-management-spec`
**Status**: Draft
**대상 화면**: `frontend/src/admin/pages/AdminManagement/AdminManagementPage.tsx`

## 목적

관리자 관리는 CareerWave 어드민 접근 주체를 생성, 조회, 권한 변경, 잠금, 삭제하고, IP ACL과 보안 감사 로그를 함께 관리하는 보안 운영 화면이다. 이 도메인의 최우선 목표는 관리자 권한 오남용을 방지하고, 모든 보안 민감 행위를 추적 가능한 상태로 남기는 것이다.

## 범위

- 포함: 관리자 계정 목록, 검색, 권한 필터, 계정 생성, 권한 변경, 계정 잠금/해제, 계정 삭제
- 포함: IP ACL 목록, 등록, 활성/비활성 전환, 삭제, 위험도 표시
- 포함: 관리자 활동 로그 조회, 행위자 필터, 보안 이벤트 severity 표시
- 제외: 관리자 로그인/토큰 발급 자체
- 제외: 백엔드 RBAC 정책 엔진의 세부 구현
- 제외: 전체 감사 로그 통합 페이지의 상세 검색 기능

## 참조 원칙

- 문서 참조 시 숫자 prefix를 제거한 경로를 사용한다.
  - 예: `specs/frontend/admin/adminManagement`
  - 예: `specs/frontend/admin/dashboard`
  - 예: `specs/frontend/admin/auditLog`
- 실제 repository 반영 전까지 파일은 요청 폴더인 `specs/frontend/admin/adminManagement`에 둔다.

## 불변 규칙

- 모든 관리자 관리 API는 JWT 인증과 `ROLE_ADMIN` 권한 검증을 전제로 한다.
- `MASTER`, `CS`, `BACKEND`, `OPS`, `BILLING`, `AUDIT`는 `ROLE_ADMIN` 내부의 관리자 세부 역할로 취급한다.
- 인증 관리자 정보는 서버의 Security Context 또는 공통 인증 유틸에서 추출되어야 하며, 프론트에서 임의로 확정하지 않는다.
- 관리자 계정 생성, 권한 변경, 잠금/해제, 삭제는 `MASTER` 권한 관리자만 수행할 수 있다.
- `MASTER` 계정은 자기 자신 또는 마지막 남은 `MASTER` 계정을 잠금/삭제할 수 없다.
- 모든 관리자 계정 변경과 ACL 변경은 감사 로그에 남겨야 한다.
- ACL 비활성화 또는 삭제는 즉시 접근 정책에 반영되어야 한다.
- 넓은 CIDR 대역은 위험도가 높게 표시되어야 하며, 관리자에게 확인 가능한 경고 정보를 제공해야 한다.
- API 연동 후 UI는 로딩, 빈 데이터, 검증 실패, 권한 실패, 부분 실패 상태를 표시해야 한다.
- 구현 브랜치는 Phase 단위로 분리하고, 다음 Phase 브랜치는 직전 Phase 브랜치를 기준으로 생성한다.
- Phase PR은 선행 Phase 변경을 포함하는 stacked branch 흐름을 따른다.

## 상태 정의

### `AdminRole`

| 값 | 표시명 | 설명 |
|---|---|---|
| `MASTER` | 마스터 관리자 | 전체 권한 통제 및 보안 승인 |
| `CS` | CS 담당 | 회원 문의, 신고, 1차 조치 |
| `BACKEND` | 백엔드 개발 | API, DB, 배포, 장애 대응 |
| `OPS` | 운영 담당 | 공지, 배너, 서비스 운영 |
| `BILLING` | 정산 담당 | 결제, 환불, 정산 확인 |
| `AUDIT` | 감사 담당 | 로그, 정책, 권한 감사 |

### `AdminStatus`

| 값 | 표시명 | 설명 |
|---|---|---|
| `ACTIVE` | 활성 | 관리자 페이지 접근 가능 |
| `LOCKED` | 잠금 | 보안 사유로 접근 제한 |

### `AuditSeverity`

| 값 | 설명 |
|---|---|
| `INFO` | 조회, 확인 등 일반 이벤트 |
| `WARN` | 권한 변경, ACL 변경 등 주의 이벤트 |
| `ERROR` | 계정 삭제, 위험 변경 감지 등 고위험 이벤트 |

## 연동 계약

- 라우트: `/admin/admins`
- 레이아웃: `frontend/src/admin/layouts/AdminLayout.tsx`
- 사이드바: `frontend/src/admin/components/AdminSidebar.tsx`
- 화면: `frontend/src/admin/pages/AdminManagement/AdminManagementPage.tsx`
- 공통 스타일: `frontend/src/admin/styles/admin.css`
- API 계약: `specs/frontend/admin/adminManagement/api-schema.md`

## 금지 패턴

- 페이지 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 권한 변경 결과를 프론트 local state만으로 확정하지 않는다.
- 관리자 비밀번호를 응답 데이터, 로그, 화면 상태에 보관하지 않는다.
- 계정 삭제를 감사 로그 없이 처리하지 않는다.
- ACL CIDR 문자열을 검증 없이 저장하지 않는다.
- 인증 관리자 ID를 URL query, localStorage, 화면 상태 값만으로 확정하지 않는다.
- 후속 Phase 브랜치를 `develop`에서 바로 생성해 선행 Phase 구현 맥락을 누락하지 않는다.
