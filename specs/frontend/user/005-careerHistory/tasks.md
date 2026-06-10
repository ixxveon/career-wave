# Tasks: Career History

> plan.md의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - 도메인 구조 설계

- [ ] Career History 도메인의 핵심 기능 범위를 정리한다.
- [ ] 취업 준비 기록 및 히스토리에서 관리할 데이터 항목을 정의한다.
- [ ] 면접 연습 기록에 포함될 텍스트/비디오 모의면접 데이터 구조를 정의한다.
- [ ] 누적 데이터 기반 AI 역량 평가에 필요한 점수 항목을 정의한다.
- [ ] 맞춤형 로드맵 가이드에 필요한 약점 분석 및 추천 액션 플랜 구조를 정의한다.
- [ ] Career History와 Document Analysis, Interview 도메인 간 연관 데이터를 확인한다.

## Phase 2 - 백엔드 엔티티 및 DTO 설계

- [ ] `CareerHistory` 엔티티 필드를 정의한다.
- [ ] `InterviewPracticeHistory` 엔티티 필드를 정의한다.
- [ ] `CareerCompetencyReport` 엔티티 필드를 정의한다.
- [ ] `CareerRoadmap` 엔티티 필드를 정의한다.
- [ ] `CareerHistoryCreateRequestDto`를 작성한다.
- [ ] `CareerHistoryResponseDto`를 작성한다.
- [ ] `CareerHistoryDetailResponseDto`를 작성한다.
- [ ] `InterviewPracticeHistoryResponseDto`를 작성한다.
- [ ] `CareerCompetencyReportResponseDto`를 작성한다.
- [ ] `CareerRoadmapResponseDto`를 작성한다.
- [ ] `ActivityType`, `InterviewType`, `CareerHistoryStatus` Enum 타입을 작성한다.
- [ ] Repository 인터페이스를 작성한다.

## Phase 3 - API 구현

- [ ] 취업 준비 기록 목록 조회 API를 구현한다.
- [ ] 취업 준비 기록 상세 조회 API를 구현한다.
- [ ] 날짜별 취업 준비 기록 조회 기능을 구현한다.
- [ ] 기업별 취업 준비 기록 조회 기능을 구현한다.
- [ ] 면접 연습 기록 조회 API를 구현한다.
- [ ] 질문-답변 매칭 데이터 조회 기능을 구현한다.
- [ ] AI 오답 하이라이팅 및 개선 피드백 조회 기능을 구현한다.
- [ ] 누적 서류 점수 및 면접 점수 기반 역량 평가 조회 API를 구현한다.
- [ ] 약점 분석 및 우선 학습 타겟 조회 기능을 구현한다.
- [ ] 맞춤형 로드맵 조회 API를 구현한다.

## Phase 4 - 프론트엔드 화면 구현

- [ ] `CareerHistoryPage.jsx`에서 취업 준비 기록 목록 화면을 구현한다.
- [ ] 날짜별/기업별 기록 목록 UI를 구현한다.
- [ ] 기록 카드에 활동 유형, 기업명, 날짜, 점수, 상태를 표시한다.
- [ ] `CareerHistoryDetailPage.jsx`에서 상세 기록 화면을 구현한다.
- [ ] 면접 스크립트, 질문-답변 매칭 데이터, AI 피드백 영역을 구현한다.
- [ ] AI 오답 및 개선 필요 답변 하이라이팅 UI를 구현한다.
- [ ] `CareerCompetencyReportPage.jsx`에서 누적 역량 평가 화면을 구현한다.
- [ ] 서류 점수, 면접 점수, 종합 점수 표시 영역을 구현한다.
- [ ] 점수 변화 그래프 또는 통계 영역을 구현한다.
- [ ] `CareerRoadmapPage.jsx`에서 맞춤형 로드맵 화면을 구현한다.
- [ ] 약점 보완용 우선 학습 타겟 및 액션 플랜 UI를 구현한다.
- [ ] 백엔드 API 연결 전 mock data 기반으로 화면을 렌더링한다.
- [ ] `careerHistoryApi.js`에 API 호출 함수 구조를 작성한다.

## Phase 5 - Polish

- [ ] `CareerHistoryDocs` 인터페이스 작성한다.  
- [ ] Swagger 문서에 취업 준비 기록 목록 조회 API를 정리한다.
- [ ] Swagger 문서에 취업 준비 기록 상세 조회 API를 정리한다.
- [ ] Swagger 문서에 면접 연습 기록 조회 API를 정리한다.
- [ ] Swagger 문서에 역량 평가 및 로드맵 조회 API를 정리한다.
- [ ] mock data 기준 프론트엔드 렌더링 테스트를 진행한다.
- [ ] API 응답 DTO와 프론트엔드 화면 데이터 구조가 일치하는지 확인한다.
- [ ] 빈 데이터, 일부 누락 데이터, 존재하지 않는 상세 기록 접근 케이스를 테스트한다.
- [ ] 통합 테스트 작성한다.