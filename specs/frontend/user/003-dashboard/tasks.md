# Tasks: Dashboard

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

---

## Phase 1 — Dashboard 데이터 타입 및 API 계약 정의

* [ ] 기존 UserMyPage.jsx 파일 TSX 전환
* [ ] 기존 ScrappedJobPage.jsx 파일 TSX 전환
* [ ] Dashboard API Schema 검토 및 데이터 구조 정의
* [ ] User Profile 타입 정의
* [ ] Github Profile 타입 정의
* [ ] Scrap Job 타입 정의
* [ ] Mock 데이터와 API 응답 구조 매핑 정의
* [ ] 화면 데이터와 API Schema 필드 매핑 검토

## Phase 2 — 내 정보 관리 데이터 연결

* [ ] 사용자 기본 정보 영역 데이터 연결
* [ ] 계정 상태 정보 영역 데이터 연결
* [ ] GitHub 연동 상태 영역 데이터 연결
* [ ] GitHub 미연동 상태 UI 구현
* [ ] 회원 정보 수정 화면 데이터 연결
* [ ] 회원 정보 수정 요청 흐름 구현
* [ ] 사용자 정보 조회 실패 상태 UI 구현

## Phase 3 — 스크랩 공고 목록 데이터 연결

* [ ] 스크랩 공고 목록 조회 데이터 연결
* [ ] 공고 제목 및 기업명 검색 기능 구현
* [ ] 최신순 정렬 기능 구현
* [ ] 스크랩 공고 카드 데이터 바인딩
* [ ] 스크랩 공고 없음 Empty State 구현
* [ ] 검색 결과 없음 상태 UI 구현
* [ ] 삭제된 공고 표시 정책 반영

## Phase 4 — 라우팅 및 사용자 액션 연결

* [ ] React Router 기반 마이페이지 하위 라우팅 연결
* [ ] 채용공고 상세 페이지 이동 연결
* [ ] 스크랩 취소 버튼 연결
* [ ] 스크랩 취소 확인 처리 구현
* [ ] 스크랩 취소 후 목록 갱신 처리
* [ ] API 오류 발생 시 사용자 안내 처리

## Phase 5 — QA 및 문서 검증

* [ ] Postman 기준 API 응답 구조 검증
* [ ] API Schema와 TypeScript 타입 일치 여부 확인
* [ ] 로딩 상태 UI 점검
* [ ] 오류 상태 UI 점검
* [ ] Empty State UI 점검
* [ ] 반응형 UI 최종 점검
* [ ] checklist.md 기반 최종 검토
* [ ] 빌드 및 화면 동작 확인
