# Checklist: Dashboard

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — 타입 및 Mock 데이터 구성

- [ ] Dashboard 타입(UserProfile, GithubProfile, ScrapJob) 정의 확인
- [ ] API Schema와 TypeScript 타입 구조 일치 확인
- [ ] Mock 데이터 구조와 API Schema 구조 일치 확인
- [ ] Enum 값(CareerLevel, NoticeStatus) 일치 확인

## Phase 2 — 내 정보 관리 데이터 연동

- [ ] 사용자 기본 정보 UI 구현 확인
- [ ] 계정 상태 정보 UI 구현 확인
- [ ] GitHub 연동 정보 UI 구현 확인
- [ ] GitHub 미연동 상태 UI 구현 확인
- [ ] 회원 정보 수정 모달 동작 확인
- [ ] 수정 데이터 화면 반영 확인

## Phase 3 — 스크랩 공고 목록 데이터 연결

- [ ] 스크랩 공고 목록 UI 구현 확인
- [ ] 검색 기능 정상 동작 확인
- [ ] 최신순 정렬 정상 동작 확인
- [ ] Empty State 정상 동작 확인
- [ ] 검색 결과 없음 상태 정상 동작 확인
- [ ] 삭제된 공고 상태 표시 확인
- [ ] 마감된 공고 상태 표시 확인

## Phase 4 — 사용자 액션 연결

- [ ] 스크랩 해제 버튼 동작 확인
- [ ] 스크랩 해제 확인 처리 확인
- [ ] 스크랩 해제 후 목록 갱신 확인
- [ ] JobNoticeDetail 연동 확인
- [ ] 삭제된 공고 상세 진입 방어 확인
- [ ] 상세 모달 북마크 해제 동작 확인

## Phase 5 — QA 및 최종 검증

- [ ] API Schema와 TypeScript 타입 일치 여부 확인
- [ ] Mock 데이터와 API Schema 구조 일치 여부 확인
- [ ] Loading State 확인
- [ ] Error State 확인
- [ ] Empty State 확인
- [ ] 반응형 UI 확인
- [ ] 화면 동작 최종 점검
- [ ] npm run build 성공 확인

## 코드 품질

- [ ] TypeScript 타입 오류 없음 확인
- [ ] React 빌드 오류 없음 확인
- [ ] API Schema와 화면 바인딩 구조 일치 확인
- [ ] Mock → API 연동 전환 가능 구조 확인
- [ ] 삭제된 공고 정책 준수 확인

## 머지 전 최종 확인

- [ ] constitution.md 불변 규칙과 실제 구현 일치 확인
- [ ] tasks.md 모든 항목 완료 확인
- [ ] PR 제목 형식 준수 확인
- [ ] 코드 리뷰 및 CodeRabbit 리뷰 반영 확인
- [ ] 최종 build 성공 확인