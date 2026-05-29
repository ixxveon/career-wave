# Implementation Plan: Document Analysis (서류 코칭)

> 작성자: 이가연 | 작성일: 2026-05-29  
> 관련 문서: `checklist.md` / `api-schema.md`  
> 레이어: **Frontend Only**

---

## Summary

유저가 입력한 이력서(파일 업로드)와 자기소개서(문항 + 답변 직접 입력)를 AI가 분석하여 직무 적합도 및 KPI 기반의 개선 피드백 리포트를 제공하는 서비스 도메인.

> **입력 방식 구분**
> - **이력서**: 파일 업로드 (PDF·DOC·DOCX, 최대 10MB)
> - **자기소개서**: 지원 회사 / 지원 직무 + 문항·답변 직접 입력 (최대 5문항 / 문항당 1000자)

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 서버 상태 | `TanStack Query` | 분석 결과 캐싱 및 로딩/에러/재시도 관리 |
| 입력 폼 상태 | React `useState` | 컴포넌트 내 단기 입력 상태 관리 |
| 시각화 | `Recharts` | 역량 점수 레이더 차트 기본 지원 ⚠️ 의존성 설치 여부 확인 필요 |
| 스타일링 | `Plain CSS` + CSS 트랜지션/애니메이션 | 프로젝트 기존 스타일링 방식 준수 |
| 세션 유지 | `SessionStorage` | 탭 종료 시 자동 만료 — `documentId` 및 분석 결과 저장 |

### 전제 조건 및 미결 항목

- 업로드 시 백엔드에서 `documentId` 발급
- 파일 업로드: `multipart/form-data` 직접 서버 전송 방식 (`POST /api/v1/resume/upload`)
- 분석 상태 추적: **폴링(Polling) vs WebSocket** (Phase 3 착수 전 백엔드와 협의 후 확정)
- 보안 검증: IDOR 방어를 위해 백엔드 API 단에서 `documentId` 소유권 검증 필수

---

## Project Structure

```text
src/
└── user/
    ├── api/
    │   └── resume/
    │       ├── uploadResume.ts             # 이력서 파일 업로드 (multipart/form-data)
    │       ├── submitCoverLetter.ts        # 자기소개서 문항/답변 제출
    │       ├── getAnalysisResult.ts        # 분석 결과 조회
    │       └── getResumeHistory.ts         # 이력 목록 페이징 조회
    ├── components/
    │   └── resume/
    │       ├── ResumeUpload.tsx            # 이력서 파일 드롭존
    │       ├── CoverLetterForm.tsx         # 자기소개서 입력 폼
    │       ├── LoadingModal.tsx            # 단계별 로딩 상태 머신
    │       ├── ReportChart.tsx             # Recharts 레이더 차트
    │       ├── FeedbackList.tsx            # Good / Bad / Fix 피드백 렌더링
    │       └── HistoryItem.tsx             # 이력 목록 아이템
    ├── hooks/
    │   └── resume/
    │       ├── useResumeUpload.ts          # 파일 검증 → 업로드 로직
    │       ├── useCoverLetterForm.ts       # 폼 입력 상태 및 유효성 관리 (local state)
    │       ├── useAnalysisResult.ts        # TanStack Query 기반 분석 결과 조회
    │       └── useResumeHistory.ts         # TanStack Query 기반 이력 목록 조회
    ├── types/
    │   └── resume.d.ts                     # API DTO 및 도메인 타입
    └── utils/
        └── resume/
            └── validation.ts               # 파일(10MB/확장자) 및 텍스트(5문항/1000자) 검증

```

---

## Phases

### Phase 1: 인프라 세팅 & 타입 정의
- [ ] `resume.d.ts` — API DTO 및 도메인 타입 정의
- [ ] `resumeStore.ts` — Zustand 스토어 설계 (서버/UI 상태 분리, 리렌더링 최적화)
- [ ] `api/` — API 함수 인터페이스 및 공통 에러/재시도(TanStack Query) 구조 작성

### Phase 2: 입력 UI 구현
**이력서 파일 업로드**
- [ ] `validation.ts` — 10MB/확장자/MIME 타입 검증
- [ ] `useResumeUpload` — 검증 → Presigned URL → S3 업로드 흐름
- [ ] `ResumeUpload` 컴포넌트 — 드롭존 및 중복 요청 방지(버튼 비활성화)

**자기소개서 텍스트 입력**
- [ ] `validation.ts` — 문항(max 5)/글자 수(max 1000) 검증
- [ ] `useCoverLetterForm` — 문항 추가/삭제, 실시간 글자 수 상태 관리
- [ ] `CoverLetterForm` 컴포넌트 — 폼 유효성 검사 및 분석 시작 버튼 연동

### Phase 3: AI 분석 로딩 흐름
- [ ] `useAnalysisResult` — 폴링/WebSocket 기반 상태 구독
- [ ] `LoadingModal` — 단계별(파일 파싱 → AI 분석 → 리포트 생성) 상태 머신 구현
- [ ] 비정상 종료 대응 — 타임아웃 및 네트워크 오류 시 에러 처리

### Phase 4: 결과 리포트 시각화
- [ ] `ReportChart` — Recharts 레이더 차트 및 Framer Motion 애니메이션
- [ ] `FeedbackList` — Good/Bad/Fix 피드백 구조 매핑 및 빈 상태(Empty State) 처리
- [ ] Profiler 체크 — 리포트 화면 내 불필요한 리렌더링 방지

### Phase 5: 리스트 페이징 & 도메인 통합
- [ ] `useResumeHistory` — 최신순 페이징 구현
- [ ] "면접 시작하기" — `documentId`를 URL 쿼리 파라미터로 면접 도메인 전달
- [ ] 면접 도메인 연동 테스트 및 404/403 에러 처리

### Phase 6: 문서화 & QA
- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] 보안 검증 — 타인 소유 `documentId` 접근 시 403 차단 테스트
- [ ] 최종 확인 — 목업 데이터 제거, Lighthouse(성능 90/접근성 95) 통과


