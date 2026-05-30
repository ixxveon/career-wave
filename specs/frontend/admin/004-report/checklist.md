# Checklist: 신고관리 (Report Management)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.
> UI 구현 완료 기준 체크 + API 연동 전 재검증 항목을 포함한다.

---

## Phase 1 — ERD 정합성

- [ ] `ReportStatus` 값이 ERD 기준 `PENDING / BLINDED / DISMISSED`만 사용한다.
- [ ] `TargetType` 값이 ERD 기준 `BOARD / COMMENT / MEMBER`만 사용한다.
- [ ] `ReportReason` 값이 ERD 기준 `SPAM / ABUSE / AD / INAPPROPRIATE / OTHER`만 사용한다.
- [ ] 신고 관련 인터페이스에 ERD에 없는 필드(`ai_suggestion` 등)가 v1 UI에 포함되지 않는다.
- [ ] 신고 ID(`reportId`) 타입이 number(BIGSERIAL 대응)로 선언되어 있다.

---

## Phase 2 — KPI 카드

- [ ] KPI 카드 4종(전체 신고 수·접수·블라인드·기각)이 표시된다.
- [ ] 각 카드 수치가 API 응답(`summary.totalCount`, `pendingCount`, `blindedCount`, `dismissedCount`)과 매핑된다.

---

## Phase 3 — 신고 목록 테이블

- [ ] 목록에 신고ID·신고 대상 유형·신고 사유·처리 상태·신고 일시·관리 컬럼이 표시된다.
- [ ] 처리 상태 필터 드롭다운이 `PENDING / BLINDED / DISMISSED` 3종과 "전체" 옵션을 포함한다.
- [ ] 신고 대상 유형 필터 드롭다운이 `BOARD / COMMENT / MEMBER` 3종과 "전체" 옵션을 포함한다.
- [ ] 신고 사유 필터 드롭다운이 5종(`SPAM / ABUSE / AD / INAPPROPRIATE / OTHER`)과 "전체" 옵션을 포함한다.
- [ ] 처리 상태 배지가 `PENDING → 접수`, `BLINDED → 블라인드`, `DISMISSED → 기각`으로 표시된다.
- [ ] 신고 대상 유형 배지가 `BOARD → 게시글`, `COMMENT → 댓글`, `MEMBER → 회원`으로 표시된다.
- [ ] 신고 사유가 한글로 표시된다 (`SPAM → 스팸`, `ABUSE → 욕설·비방` 등).
- [ ] 체크박스 UI가 렌더링된다 (전체 선택·개별 선택, 일괄 처리 기능은 v2).
- [ ] 관리 컬럼에 "상세보기" 버튼이 모든 상태에서 표시된다.

---

## Phase 4 — 신고 상세 모달

- [ ] 상세 모달에 신고자·피신고자·신고 유형·신고 사유·대상 콘텐츠(제목/본문)·신고 일시가 표시된다.
- [ ] `BLINDED / DISMISSED` 상태 신고에서 처리 상태·처리 일시가 표시된다.
- [ ] `BLINDED / DISMISSED` 상태 신고에서 처리 버튼이 비활성화 또는 미노출된다.
- [ ] `PENDING` 상태 신고에서 "블라인드 처리" / "기각 처리" 버튼이 표시된다.
- [ ] 모달 외부 클릭 또는 닫기 버튼으로 모달이 닫힌다.

---

## Phase 5 — 처리 확인 모달

- [ ] 블라인드 처리 확인 모달에 대상 콘텐츠명이 표시된다.
- [ ] 블라인드 처리 확인 모달에 "블라인드 처리 시 즉시 숨김 처리됩니다" 안내가 표시된다.
- [ ] `target_type = MEMBER`인 경우 콘텐츠 블라인드 관련 안내 문구가 표시되지 않는다.
- [ ] 기각 처리 확인 모달에 "신고를 기각하면 해당 콘텐츠는 유지됩니다" 안내가 표시된다.
- [ ] 확인 모달의 "확정" 버튼 클릭 시 처리 API가 호출된다.
- [ ] 확인 모달의 "취소" 버튼 클릭 시 모달이 닫히고 신고 상태가 변경되지 않는다.
- [ ] 처리 완료 후 목록의 상태 뱃지가 즉시 변경된다.

---

## Phase 6 — API 연동 전 체크

- [ ] `ReportItem` 인터페이스 필드가 백엔드 `ResponseList` DTO와 매핑 가능한 구조인지 확인한다.
- [ ] `ReportDetail` 인터페이스 필드가 백엔드 `ResponseDetail` DTO와 매핑 가능한 구조인지 확인한다.
- [ ] 필터 쿼리 파라미터(`status`, `targetType`, `reason`, `page`, `size`)가 현재 필터 상태와 연결 가능한 구조인지 확인한다.
- [ ] 블라인드·기각 처리 성공 응답의 `reportStatus` 값을 기반으로 목록 상태를 갱신하는 로직이 구현되어 있는지 확인한다.
- [ ] API 성공·실패 응답이 `ApiResponse<T>` 형식(`success`, `statusCode`, `message`, `data`)을 기준으로 처리되는지 확인한다.
- [ ] 서버 409 응답(이미 처리된 신고) 시 에러 메시지가 표시되는지 확인한다.
- [ ] 모든 HTTP 호출이 `frontend/src/admin/api/reportApi.ts` 또는 팀이 정한 API 계층을 통해 수행되는지 확인한다.
