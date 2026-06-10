# Tasks: Document Analysis (서류 코칭)

> `plan.md`의 Phase와 1:1 대응한다.  
> 각 항목은 하나의 커밋 또는 PR 단위로 쪼갠다.  
> 관련 문서: `plan.md` / `checklist.md` / `constitution.md`

---

## Phase 1 — 인프라 세팅 & 타입 정의 `feat(feature/user-resume-upload)`

- [x] `types/resume.d.ts` 정의 (Request/Response DTO, AnalysisResult, 상태 머신 타입)
- [x] `api/resume/` API 호출 함수 인터페이스 작성 (AbortController 지원) 및 공통 에러 핸들링 구조 세팅
- [x] TanStack Query 커스텀 훅 세팅 (queryKey 컨벤션, `retry` 정책 포함)
- [x] sessionStorage 헬퍼 유틸리티 구현 (`try-catch` 통한 직렬화/역직렬화 예외 처리 포함)

---

## Phase 2 — 입력 UI 구현

### 이력서 파일 업로드 `feat(feature/user-resume-upload)`
- [x] `utils/resume/validation.ts` — 파일 용량(10MB) / 확장자(PDF·DOC·DOCX) / MIME 타입 검증
- [x] `hooks/resume/useResumeUpload.ts` — 검증 → `POST /upload` 서버 전송 → `documentId` 저장 → 폴링 시작 흐름 구현
- [x] `components/resume/ResumeUpload.tsx` — 드롭존 UI 구현, 업로드 중 중복 요청 방지
- [x] 에러 처리 — 용량/확장자/네트워크 실패 메시지 분기 처리

### 자기소개서 텍스트 입력 `feat(feature/user-resume-cover-letter)`
- [x] `utils/resume/validation.ts` — 문항(max 5) / 글자 수(max 1000) / 필수 필드 검증
- [x] `hooks/resume/useCoverLetterForm.ts` — 폼 상태 관리 및 유효성 검사 로직
- [x] `components/resume/CoverLetterForm.tsx` — 동적 문항 추가/삭제 UI 및 실시간 글자 수 표시
- [x] 버튼 인터랙션 — 미입력 시 분석 시작 버튼 비활성화

### 공통
- [x] `documentId` sessionStorage 저장 및 새로고침 후 복원 검증

---

## Phase 3 — AI 분석 로딩 흐름 `feat(feature/user-resume-analysis)`

- [x] `hooks/resume/useAnalysisResult.ts` — WebSocket 기반 상태 구독 구현 (`useAnalysisWebSocket.ts`로 구현)
- [x] `components/resume/LoadingModal.tsx` — 상태 머신(`IDLE → SUBMITTING → ANALYZING → SUCCESS/ERROR`)에 따른 단계별 메시지 전환
- [x] 비정상 종료 처리 — 타임아웃/API 에러 시 Modal 닫힘 + 에러 상태 전이 + 에러 메시지 노출
- [x] 네트워크 단절 시 토스트 메시지 알림 처리
- [x] 페이지 이탈 후 재진입 시 sessionStorage 기반 분석 상태 복원 검증

---

## Phase 4 — 결과 리포트 시각화 `feat(feature/user-resume-report)`

- [x] `components/resume/ReportChart.tsx` — `DocumentResultView`로 통합 (SVG 링 차트 + 세부 점수 바, Recharts 미사용)
- [x] `components/resume/FeedbackList.tsx` — `DocumentResultView`로 통합 (Good/Bad/Fix + STAR 기법 + 수치화·정량화 체크)
- [x] Empty State 처리 — 피드백 항목이 비어 있을 때 안내 UI 렌더링
- [ ] 성능 최적화 — React DevTools Profiler 활용하여 불필요한 리렌더링 제거 (백엔드 연동 후 진행 예정)

---

## Phase 5 — 리스트 페이징 & 도메인 통합 `feat(feature/user-resume-history)`

- [x] `hooks/resume/useResumeHistory.ts` — 최신순 페이징 + fileType 서버사이드 필터링 구현
- [x] `components/resume/HistoryItem.tsx` — 이력 목록 아이템 렌더링 및 Empty State 대응
- [x] 면접 도메인 연동 — `documentId`를 쿼리 파라미터로 전달 (`?documentId=xxx`)
- [ ] 면접 도메인 연동 시 404/403 에러 처리 및 담당자 연동 테스트 (백엔드 구현 후 진행 예정)

---

## Phase 6 — Polish & QA `feat(feature/user-resume-history)`

- [x] 모바일/태블릿 반응형 CSS 작성 — 미디어쿼리 적용 (브라우저 검증은 백엔드 연동 후 예정)
- [x] 통합 테스트 (MSW 활용) — 주요 시나리오(업로드/분석/조회) MSW 핸들러 구현 완료
- [x] 최종 클린업 — ESLint `no-console` 검사 완료 (목업 데이터는 백엔드 연동 후 제거 예정)
- [ ] 성능 측정 — Lighthouse 성능 90점 / 접근성 95점 이상 달성 (백엔드 연동 후 진행 예정)
- [x] `checklist.md` 기반 최종 점검 및 PR 생성 (`.github/pull_request_template.md` 형식 준수)
