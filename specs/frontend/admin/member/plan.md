# Plan: 회원관리 (Member Management)

**Feature Branch**: `feature/admin-member-ui`
**담당**: 신보라
**버전**: v1
**상태**: UI 구현 완료 — API 연동 진행 중

---

## Summary

플랫폼 개인 회원(ROLE_USER)과 기업 회원(ROLE_COMPANY)의 현황 조회·제재·승인을 관리하는 어드민 페이지.
더미 데이터 기반으로 UI를 완성했으며, 현재 API 연동을 진행 중이고 v2에서 일괄처리·파일 다운로드 등 추가 기능을 개발한다.

---

## Technical Context

- React + TypeScript 기반 어드민 프론트엔드
- 대상 컴포넌트: `frontend/src/admin/pages/UserManagement/UserManagementPage.tsx`
- 스타일: `frontend/src/admin/styles/UserManagement.css`
- 아이콘: `lucide-react`
- API 계약: `specs/frontend/admin/member/api-schema.md`
- 서버 상태: API 연동 시 TanStack Query 우선 검토
- HTTP 호출: `frontend/src/admin/api` 하위 도메인 API 모듈 사용 (페이지에서 직접 호출 금지)

---

## Project Structure

```text
frontend/src/admin/pages/UserManagement/
└── UserManagementPage.tsx       # 개인/기업 회원 통합 관리 페이지

frontend/src/admin/styles/
└── UserManagement.css           # 회원관리 전용 스타일

specs/frontend/admin/member/
├── constitution.md
├── spec.md
├── plan.md                      # 이 파일
├── tasks.md
├── api-schema.md
└── checklist.md
```

---

## Phases

### ✅ Phase 1 — UI 구현 (완료)

- [x] 개인 회원 탭 — KPI 카드 4종
- [x] 개인 회원 목록 테이블 (체크박스, 검색, 상태 뱃지)
- [x] 개인 회원 상세 모달 (경고 dot indicator, WARN_THRESHOLD 권고 배지)
- [x] 활동 정지 모달 (기간 선택, 사유 입력, PERMANENT 위험색)
- [x] 기업 회원 탭 — KPI 카드 4종, 탭 뱃지
- [x] 기업 회원 목록 테이블 (키워드 검색, 승인 상태 필터)
- [x] 기업 회원 상세 모달 (재직증명서, 반려 사유)
- [x] 승인 확인 모달 / 반려 처리 모달

### ⬜ Phase 2 — API 연동 (v1 진행 예정)

- [ ] 개인 회원 목록 API 연동 (`GET /api/v1/admin/members`)
- [ ] 개인 회원 상세 API 연동 (`GET /api/v1/admin/members/{memberId}`)
- [ ] 제재 처리 API 연동 (`POST /api/v1/admin/members/{memberId}/sanctions`)
- [ ] 권한·구독·상태·가입일 범위 필터 쿼리 파라미터 연결
- [ ] 페이지네이션 API 연결
- [ ] 기업 회원 목록 API 연동 (`GET /api/v1/admin/hr-managers`)
- [ ] 기업 회원 상세 API 연동 (`GET /api/v1/admin/hr-managers/{memberId}`)
- [ ] 기업 회원 승인 API 연동 (`PATCH /api/v1/admin/hr-managers/{memberId}/approve`)
- [ ] 기업 회원 반려 API 연동 (`PATCH /api/v1/admin/hr-managers/{memberId}/reject`)
- [ ] 기업 회원 `hrStatus` 한국어 → ERD enum (`PENDING / ACTIVE / REMOVED`) 전환
- [ ] 처리 관리자 ID 하드코딩 → 로그인 세션 기반 전환
- [ ] API 실패 시 에러 메시지 처리 (`ApiResponse.message` 활용)

### ⬜ Phase 3 — 추가 기능 (v2 예정)

- [ ] 체크박스 다중 선택 → 일괄 제재 처리
- [ ] 회원 데이터 내보내기 (CSV/Excel)
- [ ] SUSPENDED 상태 회원 정지 해제 UI
- [ ] 기업 회원 재직증명서 파일 실제 다운로드/미리보기
- [ ] 기업 회원 반려 후 재신청 플로우 UI

---

## Data Flow

1. 페이지 마운트 시 개인회원·기업회원 목록을 각각 초기 로드한다.
2. 필터 드롭다운·입력값 변경은 로컬 상태만 업데이트한다.
3. 검색 버튼 클릭 또는 Enter → `appliedMemberFilters ref` 갱신 → `fetchMembers(1)` 호출.
4. 제재·승인·반려 처리 성공 → 목록 재조회하여 상태 배지 갱신.
5. 기업회원 탭 배지는 `pendingCount` (목록 API 응답 포함) 기준으로 표시한다.

---

## State Ownership

| 상태 | 소유 위치 |
|---|---|
| 개인회원 목록 (`members`) | `UserManagementPage` |
| 기업회원 목록 (`hrManagers`) | `UserManagementPage` |
| 필터 입력 상태 (`roleFilter`, `statusFilter` 등) | `UserManagementPage` (로컬) |
| 적용 필터 | `appliedMemberFilters ref`, `appliedHrFilters ref` |
| 페이지네이션 | `UserManagementPage` (`memberPage`, `hrPage`) |
| 모달 상태 (상세/정지/승인/반려) | `UserManagementPage` |

---

## Risks

- **BE 미완성**: API 연동 전까지 더미 데이터 유지, `memberApi.ts` 구조만 완성하여 전환 대비.
- **KPI 일부 항목 API 없음**: 오늘 신규·프리미엄 구독·정지 회원 수 summary API 미제공 → `—` 표시 처리.
- **기업회원 KPI 집계**: 승인완료·반려 건수는 현재 페이지 기준 집계 (전체 집계 API 없음) → 라벨 "현재 페이지 기준" 명시.
- **재직증명서 파일**: 현재 파일명 표시만, 실제 파일 스토리지 연동은 v2 예정.
