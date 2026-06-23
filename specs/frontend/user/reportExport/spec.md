# Feature Specification: Report Export

**Feature Branch**: `006-report-export`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 종합 진단 PDF 리포트 산출 (Priority: P1)

> 사용자는 자기소개서 분석, 면접 분석, 취업 히스토리 결과를 통합한 종합 진단 PDF 리포트를 생성한다.

**Acceptance Scenarios**:
1. **Given** 사용자의 Document Analysis, Interview, Career History 데이터가 존재할 때, **When** 사용자가 PDF 리포트 생성 버튼을 클릭하면, **Then** 통합된 종합 진단 리포트가 생성된다.
2. **Given** 통합 데이터가 정상적으로 매핑되었을 때, **When** 리포트가 생성되면, **Then** 서류 분석 결과, 면접 분석 결과, 취업 히스토리 결과가 하나의 PDF 문서에 표시된다.
3. **Given** 일부 분석 데이터가 부족할 때, **When** 사용자가 리포트 생성을 요청하면, **Then** 누락된 데이터는 기본 안내 문구로 대체되어 리포트가 생성된다.

---

### User Story 2 - 분석 결과 데이터 통합 및 매핑 (Priority: P1)

> 시스템은 Document Analysis, Interview, Career History 결과를 하나의 통합 데이터 구조로 가공하여 PDF 리포트 생성에 사용한다.

**Acceptance Scenarios**:
1. **Given** 각 도메인의 분석 결과 데이터가 존재할 때, **When** PDF 리포트 생성이 요청되면, **Then** 세 도메인의 데이터가 통합 DTO 형태로 매핑된다.
2. **Given** Document Analysis 데이터가 존재할 때, **When** 통합 데이터가 생성되면, **Then** 자기소개서 분석 점수와 피드백이 리포트 데이터에 포함된다.
3. **Given** Interview 데이터가 존재할 때, **When** 통합 데이터가 생성되면, **Then** 면접 태도, 답변 분석, 개선 피드백이 리포트 데이터에 포함된다.
4. **Given** Career History 데이터가 존재할 때, **When** 통합 데이터가 생성되면, **Then** 누적 성장 추이와 로드맵 정보가 리포트 데이터에 포함된다.

---

### User Story 3 - PDF 렌더링 및 다운로드 (Priority: P1)

> 사용자는 생성된 종합 진단 PDF 리포트를 로컬 파일로 다운로드하여 오프라인 문서로 보관한다.

**Acceptance Scenarios**:
1. **Given** 종합 진단 리포트 데이터가 준비된 상태에서, **When** 사용자가 다운로드 버튼을 클릭하면, **Then** PDF 파일이 생성되어 다운로드된다.
2. **Given** PDF 렌더링이 완료되었을 때, **When** 다운로드가 실행되면, **Then** 기업 BI 컬러와 기본 양식이 적용된 PDF 문서가 저장된다.
3. **Given** PDF 생성 또는 다운로드 중 오류가 발생했을 때, **When** 다운로드가 실패하면, **Then** 사용자에게 실패 안내 메시지가 표시된다.

---

### User Story 4 - 리포트 미리보기 확인 (Priority: P2)

> 사용자는 PDF 파일을 다운로드하기 전에 종합 진단 리포트의 주요 내용을 화면에서 미리 확인한다.

**Acceptance Scenarios**:
1. **Given** 리포트 데이터가 준비된 상태에서, **When** 사용자가 리포트 페이지에 접근하면, **Then** PDF에 포함될 주요 요약 정보가 화면에 표시된다.
2. **Given** 사용자가 미리보기 화면을 확인할 때, **When** 리포트 데이터가 일부 누락되어 있으면, **Then** 누락된 영역은 기본 안내 문구로 표시된다.

---

### Edge Cases

- Document Analysis, Interview, Career History 데이터 중 일부가 없을 경우 PDF 리포트를 생성할 것인가?
- PDF 생성에 필요한 통합 DTO 매핑이 실패하면 어떤 메시지를 보여줄 것인가?
- PDF 렌더링 중 브라우저 또는 서버 오류가 발생하면 어떻게 처리할 것인가?
- 사용자가 다운로드 버튼을 여러 번 클릭했을 경우 중복 다운로드를 허용할 것인가?
- PDF 파일명이 중복될 경우 어떤 방식으로 파일명을 생성할 것인가?
- 브라우저 환경에 따라 PDF 다운로드가 차단될 경우 사용자에게 어떻게 안내할 것인가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 Document Analysis, Interview, Career History 데이터를 통합하여 PDF 리포트 생성용 데이터로 가공해야 한다.
- **FR-002**: 시스템은 세 도메인의 분석 결과를 하나의 통합 DTO 형태로 매핑해야 한다.
- **FR-003**: 시스템은 자기소개서 분석 점수와 피드백을 PDF 리포트에 포함해야 한다.
- **FR-004**: 시스템은 면접 분석 결과와 개선 피드백을 PDF 리포트에 포함해야 한다.
- **FR-005**: 시스템은 취업 히스토리 기반 누적 성장 추이와 로드맵 정보를 PDF 리포트에 포함해야 한다.
- **FR-006**: 시스템은 통합된 분석 데이터를 기반으로 종합 진단 PDF 리포트를 생성해야 한다.
- **FR-007**: 시스템은 기업 BI 컬러와 기본 양식이 적용된 PDF 템플릿을 제공해야 한다.
- **FR-008**: 시스템은 사용자가 PDF 리포트를 로컬 환경에 다운로드할 수 있도록 해야 한다.
- **FR-009**: 시스템은 PDF 생성 또는 다운로드 실패 시 사용자에게 오류 안내 메시지를 표시해야 한다.
- **FR-010**: 시스템은 일부 데이터가 누락되어도 PDF 리포트가 깨지지 않도록 기본 안내 문구를 제공해야 한다.
- **FR-011**: 시스템은 백엔드 API 연결 전까지 mock data를 사용하여 PDF 미리보기 화면을 구성할 수 있어야 한다.
- **FR-012**: 시스템은 PDF 생성 방식이 확정되면 백엔드 템플릿 방식 또는 프론트엔드 렌더링 방식 중 하나를 적용해야 한다.

### Key Entities

- **ReportExport**:
  - `id`: PDF 리포트 ID
  - `userId`: 사용자 ID
  - `reportTitle`: 리포트 제목
  - `createdAt`: 리포트 생성일
  - `fileName`: PDF 파일명
  - `downloadUrl`: PDF 다운로드 경로
  - `status`: 리포트 생성 상태

- **ReportExportDto**:
  - `userProfile`: 사용자 기본 정보
  - `documentAnalysisData`: 자기소개서 분석 데이터
  - `interviewAnalysisData`: 면접 분석 데이터
  - `careerHistoryData`: 취업 히스토리 데이터
  - `careerTrend`: 누적 성장 추이
  - `strengths`: 강점 목록
  - `weaknesses`: 약점 목록
  - `roadmap`: 추천 로드맵
  - `pdfTheme`: PDF 테마 정보

- **DocumentAnalysisReportData**:
  - `documentScore`: 서류 분석 점수
  - `contentFeedback`: 자기소개서 내용 피드백
  - `keywordFeedback`: 핵심 키워드 피드백
  - `improvementPoints`: 개선 포인트

- **InterviewReportData**:
  - `interviewScore`: 면접 점수
  - `attitudeFeedback`: 면접 태도 피드백
  - `answerFeedback`: 답변 분석 피드백
  - `highlightedIssues`: 개선 필요 답변 목록

- **CareerHistoryReportData**:
  - `totalPracticeCount`: 전체 취업 준비 기록 수
  - `averageScore`: 평균 점수
  - `growthTrend`: 성장 추이
  - `priorityTargets`: 우선 학습 타겟
  - `roadmapSummary`: 로드맵 요약

## Success Criteria

- **SC-001**: 사용자는 종합 진단 PDF 리포트를 생성할 수 있다.
- **SC-002**: PDF 리포트에는 Document Analysis, Interview, Career History 결과가 통합되어 표시된다.
- **SC-003**: 시스템은 세 도메인의 데이터를 하나의 통합 DTO 형태로 매핑할 수 있다.
- **SC-004**: 사용자는 PDF 다운로드 버튼을 클릭하여 리포트를 로컬 파일로 저장할 수 있다.
- **SC-005**: PDF 리포트에는 기업 BI 컬러와 기본 양식이 적용된다.
- **SC-006**: 일부 데이터가 누락되어도 PDF 생성 화면 또는 리포트가 깨지지 않는다.
- **SC-007**: PDF 생성 실패 시 사용자에게 오류 안내 메시지가 표시된다.
- **SC-008**: `npm run dev` 실행 시 PDF 리포트 관련 사용자 페이지가 오류 없이 렌더링된다.
- **SC-009**: 브라우저 콘솔에 React 렌더링 오류 또는 import 오류가 발생하지 않는다.
- **SC-010**: 기존 사용자 페이지와 관리자 페이지의 동작에 영향을 주지 않는다.

## Assumptions

- Report Export는 사용자 페이지 기준 기능으로 구현한다.
- 적용 모듈은 `user-backend`, `user-frontend`를 기준으로 한다.
- PDF 리포트는 Document Analysis, Interview, Career History 데이터 통합을 전제로 한다.
- PDF 생성 방식은 백엔드 정적 템플릿 엔진 또는 프론트엔드 `html2canvas`, `jsPDF` 방식 중 팀 결정에 따른다.
- 현재 프론트엔드 구현 단계에서는 백엔드 API가 완성되지 않았을 수 있으므로 mock data를 우선 사용한다.
- 실제 PDF 파일 생성, 저장, 다운로드 API 연동은 백엔드 명세 확정 후 진행한다.
- 로그인 인증 및 권한 검증은 기존 인증 구조를 따른다.
- 관리자 페이지, FastAPI 모델 서빙 구조, 공통 인프라 설정은 현재 작업 범위에서 제외한다.