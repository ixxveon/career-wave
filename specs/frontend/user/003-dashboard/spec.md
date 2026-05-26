# Feature Specification: 마이페이지 대시보드

**Feature Branch**: `003-dashboard`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 취업 준비 현황 확인 (Priority: P1)

> 구직자는 마이페이지에서 이력서, 자기소개서, AI 면접 연습, 추천 액션 등 취업 준비 현황을 한눈에 확인한다.

### User Story 1 - 취업 준비 현황 확인 (Priority: P1)

> 구직자는 마이페이지에서 이력서, 자기소개서, AI 면접 연습, 추천 액션 등 취업 준비 현황을 한눈에 확인한다.

**Acceptance Scenarios**:
1. **Given** 사용자가 마이페이지에 접속했을 때, **When** 취업 준비 진행도 카드를 확인하면, **Then** 이력서 완성도, 자기소개서 작성률, AI 면접 연습 횟수가 표시된다.
2. **Given** AI 면접 연습 데이터가 존재할 때, **When** 사용자가 AI 면접 연습 현황 카드를 확인하면, **Then** 누적 연습 횟수, 이번 주 연습 횟수, 최근 모의면접 점수 추이가 표시된다.
3. **Given** 사용자가 자세히 보기 버튼을 클릭했을 때, **When** 이동 이벤트가 실행되면, **Then** 관련 기능 페이지로 이동한다.
4. **Given** 추천 액션 데이터가 존재할 때, **When** 사용자가 추천 액션 영역을 확인하면, **Then** 오늘 수행해야 할 추천 행동이 표시된다.
---

### User Story 2 - GitHub 성장 그래프 확인 (Priority: P2)

> 구직자는 GitHub 활동 기반 성장 데이터를 확인하여 개발 학습 흐름을 파악한다.

**Acceptance Scenarios**:
1. **Given** GitHub 연동 데이터가 존재할 때, **When** 사용자가 GitHub 성장 그래프 카드를 확인하면, **Then** 총 커밋 수, 활동 일수, 주요 기술 스택 성장도가 표시된다.
2. **Given** 사용자가 GitHub 프로필 보기 버튼을 클릭했을 때, **When** 외부 링크 이동 이벤트가 실행되면, **Then** 사용자의 GitHub 프로필 페이지가 새 탭으로 열린다.

---

### User Story 3 - 최근 활동 및 관심 기업 확인 (Priority: P2)

> 구직자는 최근 활동 내역과 관심 기업 정보를 확인하여 다음 취업 준비 행동을 결정한다.

**Acceptance Scenarios**:
1. **Given** 최근 활동 데이터가 존재할 때, **When** 사용자가 최근 활동 영역을 확인하면, **Then** 활동 내역 리스트가 표시된다.
2. **Given** 관심 기업 데이터가 존재할 때, **When** 사용자가 관심 기업 카드를 확인하면, **Then** 관심 기업 목록과 채용 여부가 표시된다.

---

### Edge Cases

- GitHub 연동 데이터가 없는 경우 어떤 안내 문구를 보여줄 것인가?
- 최근 활동 내역이 없는 경우 어떤 빈 상태 메시지를 표시할 것인가?
- 관심 기업이 없는 경우 어떤 기본 UI를 제공할 것인가?
- API 응답 실패 시 사용자에게 어떤 에러 메시지를 보여줄 것인가?

## Requirements

### Functional Requirements

- **FR-001**: 사용자는 마이페이지에서 취업 준비 진행 현황을 확인할 수 있어야 한다.
- **FR-002**: 사용자는 취업 준비 관련 상세 페이지로 이동할 수 있어야 한다.
- **FR-003**: 사용자는 GitHub 활동 기반 성장 데이터를 확인할 수 있어야 한다.
- **FR-004**: 사용자는 GitHub 프로필 페이지로 이동할 수 있어야 한다.
- **FR-005**: 사용자는 최근 활동 내역을 확인할 수 있어야 한다.
- **FR-006**: 사용자는 관심 기업 목록과 채용 여부를 확인할 수 있어야 한다.
- **FR-007**: 사용자는 오늘의 추천 액션 정보를 확인할 수 있어야 한다.

### Key Entities

- **MyPageProgress**: resumeCompletionRate, coverLetterCompletionRate, interviewPracticeCount
- **GithubGrowth**: totalCommitCount, weeklyCommitCount, activeDays, techStackGrowth
- **RecentActivity**: activityId, title, createdAt
- **FavoriteCompany**: companyId, companyName, isHiring

## Success Criteria

- **SC-001**: 사용자는 마이페이지에서 취업 준비 현황을 한눈에 확인할 수 있다.
- **SC-002**: 주요 버튼 클릭 시 관련 페이지 또는 외부 링크로 정상 이동한다.
- **SC-003**: GitHub 성장 데이터가 화면에 정상적으로 표시된다.
- **SC-004**: 최근 활동 및 관심 기업 데이터가 화면에 정상적으로 표시된다.
- **SC-005**: 프론트엔드 빌드가 정상적으로 통과한다.

## Assumptions

- 초기 개발 단계에서는 mock 데이터를 사용한다.
- 실제 데이터 연동은 백엔드 API 개발 이후 진행한다.
- GitHub 데이터 연동은 추후 API 연동 방식 확정 후 적용한다.
- 마이페이지 대시보드에서는 데이터 조회와 화면 표시를 우선 구현하며, 데이터 생성 및 수정 기능은 v1 범위에서 제외한다.