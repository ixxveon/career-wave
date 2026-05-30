# Tasks: 신고관리 (Report Management)

> `plan.md`의 Phase와 1:1 대응한다.
> v1 완료 항목은 ✅ 표시, v2 예정 항목은 [ ] 표시한다.

---

## Phase 1 — UI 구현 ✅

### KPI 카드

- [x] KPI 카드 4종 렌더링 (전체 신고·처리 대기·블라인드 처리·AI 고위험 감지)

### 신고 목록 테이블

- [x] 신고 목록 테이블 구성 (신고ID·유형·게시판·신고 대상·신고자·신고 사유·접수일·상태·관리)
- [x] 처리 상태 필터 드롭다운 (전체 / 처리 대기 / 블라인드 / 기각)
- [x] 신고 대상 유형 필터 드롭다운 (전체 / 게시글 / 댓글 / 회원)
- [x] 키워드 검색 (신고ID·신고 대상명·신고자명)
- [x] 처리 상태 배지 (`PENDING → 처리 대기`, `BLINDED → 블라인드`, `DISMISSED → 기각`)
- [x] 신고 대상 유형 배지 (`BOARD → 게시글`, `COMMENT → 댓글`, `MEMBER → 회원`)
- [x] 신고 사유 한글 매핑 상수 (`SPAM → 스팸/광고`, `ABUSE → 욕설/비방`, `AD → 광고성`, `INAPPROPRIATE → 부적절한 내용`, `OTHER → 기타`)
- [x] 체크박스 UI (전체 선택·개별 선택)
- [x] 일괄 처리 바 (선택 건수 표시, 일괄 블라인드·기각·삭제 버튼)
- [x] 관리 컬럼 "상세보기" 버튼

### 신고 상세 모달

- [x] 상세 모달 기본 정보 영역 (신고ID·유형·신고 사유·게시판·접수일·신고 대상·신고자·본문·현재 상태)
- [x] `BLINDED / DISMISSED` 상태 신고 — 현재 상태 표시, 처리 버튼 미노출
- [x] `PENDING` 상태 신고 — "블라인드" / "기각" 버튼 표시
- [x] `BOARD` / `COMMENT` 대상 — "게시글 삭제" / "댓글 삭제" 버튼 표시
- [x] "회원 제재" 버튼 (target_type 무관 공통 표시)
- [x] 블라인드/기각 버튼 클릭 시 즉시 상태 변경 (별도 확인 모달 없음)

### 콘텐츠 AI 검토 영역

- [x] AI 검토 결과 있는 경우 — 심각도 배지·처리 권고·AI 요약 표시
- [x] AI 검토 결과 없는 경우 — "AI 검토 요청" 버튼 표시
- [x] AI 검토 요청 중 로딩 상태 표시

### 대상 회원 AI 검토 영역

- [x] AI 검토 결과 있는 경우 — 누적 신고 건수·위험도·경고 횟수(dot indicator)·제재 권고 표시
- [x] `warningCount >= WARN_THRESHOLD(3)` 시 "활동정지 권고" 표시
- [x] `warningCount === WARN_THRESHOLD - 1` 시 "1회 추가 시 활동정지 권고" 표시
- [x] AI 검토 결과 없는 경우 — "대상 회원 AI 검토 요청" 버튼 표시

### 회원 제재 모달

- [x] 제재 유형 버튼 3종 (경고 / 활동정지 / 블랙리스트)
- [x] `SUSPEND` 선택 시 정지 기간 버튼 4종 (3일 / 7일 / 30일 / 영구)
- [x] 제재 사유 텍스트에어리어
- [x] 제재 사유 미입력 시 "제재 적용" 버튼 비활성화
- [x] 처리 관리자 ID 표시 영역

---

## Phase 2 — API 연동

- [ ] `frontend/src/admin/api/reportApi.ts` API 모듈 작성
- [ ] KPI 집계 API 연동 및 더미 데이터 제거 (`GET /api/admin/reports/summary`)
- [ ] 신고 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/reports`)
- [ ] 처리 상태·신고 유형 필터 쿼리 파라미터 연결
- [ ] 페이지네이션 API 연결 (page, size)
- [ ] 신고 상세 API 연동 (`GET /api/admin/reports/{reportId}`)
- [ ] 블라인드 처리 API 연동 (`PATCH /api/admin/reports/{reportId}/blind`)
- [ ] 기각 처리 API 연동 (`PATCH /api/admin/reports/{reportId}/dismiss`)
- [ ] 처리 성공 후 목록의 상태 뱃지 즉시 갱신 (서버 응답 기반)
- [ ] API 실패 시 에러 메시지 표시 (`ApiResponse.message` 활용)
- [ ] 서버 409 응답(이미 처리된 신고) 처리

---

## Phase 3 — 추가 기능 (v2 예정)

- [ ] 신고 사유 필터 드롭다운 (SPAM / ABUSE / AD / INAPPROPRIATE / OTHER) 추가
- [ ] 일괄 블라인드·기각 처리 API 연동
- [ ] AI 검토 서버 API 연동 (현재 mock setTimeout 방식 → 실제 AI API 전환)
- [ ] 회원 제재 API 연동 (`POST /api/admin/members/{memberId}/sanctions`)
- [ ] 게시글/댓글 삭제 API 연동
