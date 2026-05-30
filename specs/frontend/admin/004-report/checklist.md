# Checklist: 신고관리 (Report Management)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.
> UI 구현 완료 기준 체크 + API 연동 전 재검증 항목을 포함한다.

---

## Phase 1 — ERD 정합성

- [x] `ReportStatus` 값이 ERD 기준 `PENDING / BLINDED / DISMISSED`만 사용한다.
- [x] `TargetType` 값이 ERD 기준 `BOARD / COMMENT / MEMBER`만 사용한다.
- [x] `ReportReason` 값이 ERD 기준 `SPAM / ABUSE / AD / INAPPROPRIATE / OTHER`만 사용한다.
- [x] 신고 ID(`id`) 타입이 string으로 선언되어 있다. (API 연동 시 number/BIGSERIAL로 전환)

---

## Phase 2 — KPI 카드

- [x] KPI 카드 4종(전체 신고·처리 대기·블라인드 처리·AI 고위험 감지)이 표시된다.
- [x] AI 고위험 감지 건수가 `aiReview.severity === '높음'` 기준으로 집계된다.

---

## Phase 3 — 신고 목록 테이블

- [x] 목록에 신고ID·유형·게시판·신고 대상·신고자·신고 사유·접수일·상태·관리 컬럼이 표시된다.
- [x] 처리 상태 필터 드롭다운이 `PENDING / BLINDED / DISMISSED` 3종과 "전체" 옵션을 포함한다.
- [x] 신고 대상 유형 필터 드롭다운이 `BOARD / COMMENT / MEMBER` 3종과 "전체" 옵션을 포함한다.
- [x] 키워드 검색이 신고ID·신고 대상명·신고자명을 대상으로 작동한다.
- [x] 처리 상태 배지가 `PENDING → 처리 대기`, `BLINDED → 블라인드`, `DISMISSED → 기각`으로 표시된다.
- [x] 신고 유형 배지가 `BOARD → 게시글`, `COMMENT → 댓글`, `MEMBER → 회원`으로 표시된다.
- [x] 체크박스 UI가 렌더링된다 (전체 선택·개별 선택).
- [x] 체크박스 선택 시 일괄 처리 바(블라인드/기각/삭제)가 표시된다.
- [x] 관리 컬럼에 "상세보기" 버튼이 모든 상태에서 표시된다.

---

## Phase 4 — 신고 상세 모달

- [x] 상세 모달에 신고자·피신고자·신고 유형·신고 사유·대상 콘텐츠 본문·신고 일시·현재 상태가 표시된다.
- [x] `BLINDED / DISMISSED` 상태 신고에서 처리 버튼(블라인드/기각)이 미노출된다.
- [x] `PENDING` 상태 신고에서 "블라인드" / "기각" 버튼이 표시된다.
- [x] `BOARD` / `COMMENT` 대상에서 "게시글 삭제" / "댓글 삭제" 버튼이 표시된다.
- [x] "회원 제재" 버튼이 모든 target_type에서 표시된다.
- [x] 블라인드/기각 버튼 클릭 시 별도 확인 모달 없이 즉시 상태가 변경된다.
- [x] 모달 외부 클릭 또는 닫기 버튼으로 모달이 닫힌다.

---

## Phase 5 — AI 검토

- [x] AI 검토 결과가 있는 경우 심각도 배지·처리 권고·요약이 표시된다.
- [x] AI 검토 결과가 없는 경우 "AI 검토 요청" 버튼이 표시된다.
- [x] 대상 회원 AI 검토 결과가 있는 경우 누적 신고·위험도·경고 횟수(dot indicator)·제재 권고가 표시된다.
- [x] `warningCount >= WARN_THRESHOLD(3)`일 때 "활동정지 권고" 배지가 표시된다.
- [x] AI 검토 결과가 자동으로 처리 상태를 변경하지 않는다. (관리자 클릭 필수)

---

## Phase 6 — 회원 제재 모달

- [x] 제재 유형 버튼 3종(경고/활동정지/블랙리스트)이 표시된다.
- [x] `SUSPEND(활동정지)` 선택 시 정지 기간 버튼 4종(3일/7일/30일/영구)이 표시된다.
- [x] 제재 사유 텍스트에어리어에 입력이 가능하다.
- [x] 제재 사유 미입력 시 "제재 적용" 버튼이 비활성화된다.
- [x] 처리 관리자 ID 표시 영역이 렌더링된다.

---

## Phase 7 — API 연동 전 체크

- [ ] `Report` 인터페이스 필드가 백엔드 `ResponseList` DTO와 매핑 가능한 구조인지 확인한다.
- [ ] `Report` 상세 필드가 백엔드 `ResponseDetail` DTO와 매핑 가능한 구조인지 확인한다.
- [ ] 신고 ID 타입이 string → number(BIGSERIAL)로 전환되었는지 확인한다.
- [ ] 필터 쿼리 파라미터(`status`, `targetType`, `page`, `size`)가 현재 필터 상태와 연결 가능한 구조인지 확인한다.
- [ ] 블라인드·기각 처리 성공 응답의 `reportStatus`를 기반으로 목록 상태를 갱신하는 로직이 구현되어 있는지 확인한다.
- [ ] API 성공·실패 응답이 `ApiResponse<T>` 형식을 기준으로 처리되는지 확인한다.
- [ ] 서버 409 응답(이미 처리된 신고) 시 에러 메시지가 표시되는지 확인한다.
- [ ] 모든 HTTP 호출이 `frontend/src/admin/api/reportApi.ts`를 통해 수행되는지 확인한다.
