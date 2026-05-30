# Tasks: 회원관리 (Member Management)

> `plan.md`의 Phase와 1:1 대응한다.
> v1 완료 항목은 ✅ 표시, v2 예정 항목은 [ ] 표시한다.

---

## Phase 1 — UI 구현 (v1 완료)

### 개인 회원 탭

- [x] KPI 카드 4종 렌더링 (전체 회원 수·오늘 신규·프리미엄 구독·정지 회원 수)
- [x] 개인 회원 탭 키워드 검색 (이름·이메일·로그인 ID 실시간 필터링)
- [x] 회원 목록 테이블 구성 (체크박스·번호·이름·이메일·로그인ID·유형·플랜·가입일·상태·관리)
- [x] 회원유형 배지 (`ROLE_USER → 개인`, `ROLE_COMPANY → 기업`)
- [x] 플랜 배지 (`FREE / PREMIUM` 스타일 구분)
- [x] 상태 배지 (`ACTIVE → 정상`, `SUSPENDED → 정지`, `BANNED → 영구정지`)
- [x] 체크박스 전체 선택/개별 선택
- [x] 테이블 가로 스크롤 (`tableScroll` 래퍼)

### 개인 회원 상세 모달

- [x] 상세 모달 — 기본 정보 영역 (권한·플랜·가입일·최근 접속·현재 상태·신고 횟수)
- [x] 경고 dot indicator (`WARN_THRESHOLD = 3` 기준 채움/빔 표시)
- [x] 경고 횟수 텍스트 (`N/3회`)
- [x] `warningCount >= WARN_THRESHOLD` 시 "활동정지 권고" 배지
- [x] `warningCount === WARN_THRESHOLD - 1` 시 "1회 추가 시 활동정지 권고" 안내
- [x] 상세 모달 → 활동 정지 모달 전환

### 활동 정지 모달

- [x] 정지 기간 선택 버튼 4종 (3일/7일/30일/영구)
- [x] 선택된 기간 강조 스타일 (진한 배경)
- [x] `PERMANENT` 선택 시 확정 버튼 붉은 계열 색상 전환
- [x] 기본 선택값 `SEVEN_DAYS` 설정
- [x] 정지 사유 텍스트에어리어
- [x] 처리 관리자 ID 표시 영역

### 기업 회원 탭

- [x] 승인 대기 건수 탭 뱃지
- [x] KPI 카드 4종 (전체·승인 대기·승인 완료·반려)
- [x] 기업 회원 키워드 검색 (담당자명·기업명·이메일 실시간 필터링)
- [x] 승인 상태 필터 드롭다운 (전체/승인 대기/승인 완료/반려)
- [x] 기업 회원 목록 테이블 구성
- [x] 재직증명서 파일명 말줄임 처리 (18자 초과 시 `…`)
- [x] 승인 대기 건에만 "승인" 버튼 노출

### 기업 회원 상세·승인·반려 모달

- [x] 기업 회원 상세 모달 (HR 담당자 정보·재직증명서·반려 사유)
- [x] 승인 대기 시 "승인 처리" / "반려 처리" 버튼 노출
- [x] 승인 확인 모달 (담당자명·기업명·즉시 이용 안내)
- [x] 반려 처리 모달 (사유 입력창·"신청자에게 안내됩니다" 문구)

---

## Phase 2 — API 연동 (v1 진행 예정)

### 개인 회원

- [ ] `frontend/src/admin/api/memberApi.ts` API 모듈 작성
- [ ] 개인 회원 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/members`)
- [ ] 권한·구독·상태 필터 드롭다운 쿼리 파라미터 연결
- [ ] 가입일 범위 필터 쿼리 파라미터 연결
- [ ] 페이지네이션 API 연결 (page, size)
- [ ] 개인 회원 상세 API 연동 (`GET /api/admin/members/{memberId}`)
- [ ] 제재 처리 API 연동 (`POST /api/admin/members/{memberId}/sanctions`)
- [ ] 제재 처리 성공 후 목록 상태 뱃지 즉시 갱신
- [ ] API 실패 시 에러 메시지 표시 (`ApiResponse.message` 활용)

### 기업 회원

- [ ] 기업 회원 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/hr-managers`)
- [ ] `hrStatus` 한국어 → ERD enum (`PENDING / ACTIVE / REMOVED`) 전환
- [ ] 기업 회원 상세 API 연동 (`GET /api/admin/hr-managers/{memberId}`)
- [ ] 승인 API 연동 (`PATCH /api/admin/hr-managers/{memberId}/approve`)
- [ ] 반려 API 연동 (`PATCH /api/admin/hr-managers/{memberId}/reject`) + 반려 사유 미입력 유효성 검증 추가
- [ ] 처리 관리자 ID 로그인 세션 기반으로 전환

---

## Phase 3 — 추가 기능 (v2 예정)

- [ ] 체크박스 다중 선택 후 일괄 제재 처리 UI 및 API 연동
- [ ] 회원 데이터 내보내기 (CSV/Excel) API 연동
- [ ] SUSPENDED 상태 회원 정지 해제 모달 및 API 연동
- [ ] 재직증명서 파일 실제 다운로드/미리보기 (파일 스토리지 연동)
- [ ] 기업 회원 반려 후 재신청 플로우 UI
