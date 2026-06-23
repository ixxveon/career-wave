# Tasks: Report Export

> plan.md의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - 통합 데이터 구조 설계

- [x] Report Export 도메인의 핵심 기능 범위를 정리한다.
- [x] PDF 리포트에 포함될 데이터 항목을 정의한다.
- [x] Document Analysis 결과 데이터 구조를 확인한다.
- [x] Interview 결과 데이터 구조를 확인한다.
- [x] Career History 결과 데이터 구조를 확인한다.
- [x] 세 도메인의 결과 데이터를 하나의 PDF 생성용 DTO로 매핑하는 구조를 설계한다.
- [x] PDF 리포트 미리보기 화면에 필요한 데이터 구조를 정의한다.
- [x] 일부 데이터가 누락된 경우 기본 안내 문구 처리 방식을 정의한다.

## Phase 2 - 백엔드 PDF 생성 흐름 설계

- [ ] `ReportExport` 엔티티 필드를 정의한다.
- [ ] `ReportExportRequestDto`를 작성한다.
- [ ] `ReportExportResponseDto`를 작성한다.
- [ ] `ReportExportDataDto`를 작성한다.
- [ ] `DocumentAnalysisReportDataDto`를 작성한다.
- [ ] `InterviewReportDataDto`를 작성한다.
- [ ] `CareerHistoryReportDataDto`를 작성한다.
- [ ] `ReportExportStatus` Enum 타입을 작성한다.
- [ ] `ReportFileType` Enum 타입을 작성한다.
- [ ] `ReportExportRepository`를 작성한다.
- [ ] PDF 파일명 생성 규칙을 정의한다.
- [ ] PDF 생성 상태값 처리 흐름을 정의한다.

## Phase 3 - PDF 생성 및 다운로드 API 구현

- [x] 종합 진단 리포트 생성 API를 구현한다.
- [x] Document Analysis 결과 조회 및 매핑 로직을 구현한다.
- [x] Interview 결과 조회 및 매핑 로직을 구현한다.
- [x] Career History 결과 조회 및 매핑 로직을 구현한다.
- [x] 통합 DTO 생성 로직을 구현한다.
- [x] PDF 템플릿 데이터 변환 로직을 구현한다.
- [x] PDF 미리보기 데이터 조회 API를 구현한다.
- [x] PDF 다운로드 API를 구현한다.
- [x] PDF 생성 실패 시 예외 처리 로직을 구현한다.
- [x] 데이터 누락 시 기본 안내 문구를 반환하는 로직을 구현한다.

## Phase 4 - 프론트엔드 리포트 화면 구현

- [x] `ReportExportPage.jsx`에서 종합 진단 리포트 생성 화면을 구현한다.
- [x] Document Analysis, Interview, Career History 통합 결과 요약 UI를 구현한다.
- [x] `ReportPreviewPage.jsx`에서 PDF 미리보기 화면을 구현한다.
- [x] 자기소개서 분석 결과 영역을 구현한다.
- [x] 면접 분석 결과 영역을 구현한다.
- [x] 취업 히스토리 및 성장 추이 영역을 구현한다.
- [x] 맞춤형 로드맵 요약 영역을 구현한다.
- [x] PDF 생성 버튼 UI를 구현한다.
- [x] PDF 다운로드 버튼 UI를 구현한다.
- [x] PDF 생성 실패 안내 메시지 UI를 구현한다.
- [x] 백엔드 API 연결 전 mock data 기반으로 화면을 렌더링한다.
- [x] `reportExportApi.js`에 API 호출 함수 구조를 작성한다.

## Phase 5 - Polish

- [ ] `ReportExportDocs` 인터페이스 작성한다.
- [ ] Swagger 문서에 종합 진단 리포트 생성 API를 정리한다.
- [ ] Swagger 문서에 PDF 미리보기 데이터 조회 API를 정리한다.
- [ ] Swagger 문서에 PDF 다운로드 API를 정리한다.
- [x] mock data 기준 프론트엔드 렌더링 테스트를 진행한다.
- [x] PDF 생성용 DTO와 프론트엔드 미리보기 데이터 구조가 일치하는지 확인한다.
- [x] PDF 생성 실패, 데이터 누락, 중복 다운로드 케이스를 테스트한다.
- [x] PDF 파일명과 다운로드 응답 형식을 확인한다.
- [ ] 통합 테스트 작성한다.