# Implementation Plan: Report Export

## Summary

> 사용자가 Document Analysis, Interview, Career History 결과를 통합한 종합 진단 PDF 리포트를 생성하고 다운로드할 수 있는 Report Export 기능을 구현한다.

## Technical Context

> 사용하는 주요 라이브러리, 전략, 전제 조건을 기술한다.

- 적용 모듈은 `user-backend`, `user-frontend`이다.
- Report Export는 Document Analysis, Interview, Career History 도메인의 분석 결과 데이터를 통합한다.
- 통합 데이터는 PDF 생성용 DTO로 매핑한다.
- PDF 리포트에는 자기소개서 분석 결과, 면접 분석 결과, 취업 준비 히스토리, 누적 성장 추이, 맞춤형 로드맵이 포함된다.
- PDF 생성 방식은 팀 결정에 따라 백엔드 템플릿 엔진 방식 또는 프론트엔드 `html2canvas`, `jsPDF` 방식 중 하나를 적용한다.
- 백엔드 API 연동 전까지 프론트엔드는 mock data를 사용하여 PDF 미리보기 화면을 구현할 수 있다.
- PDF에는 기업 BI 컬러와 공통 양식이 적용되어야 한다.
- 사용자는 생성된 PDF 리포트를 로컬 환경에 다운로드할 수 있어야 한다.
- PDF 생성 또는 다운로드 실패 시 사용자에게 오류 안내 메시지를 제공한다.

## Project Structure

```txt
user-backend/
└── domain/reportExport/
    ├── controller/
    │   └── ReportExportController.java
    ├── service/
    │   ├── ReportExportService.java
    │   └── ReportExportServiceImpl.java
    ├── repository/
    │   └── ReportExportRepository.java
    ├── entity/
    │   └── ReportExport.java
    ├── dto/
    │   ├── ReportExportRequestDto.java
    │   ├── ReportExportResponseDto.java
    │   ├── ReportExportDataDto.java
    │   ├── DocumentAnalysisReportDataDto.java
    │   ├── InterviewReportDataDto.java
    │   └── CareerHistoryReportDataDto.java
    ├── type/
    │   ├── ReportExportStatus.java
    │   └── ReportFileType.java
    └── docs/
        └── ReportExportDocs.java

user-frontend/
└── src/user/pages/reportExport/
    ├── ReportExportPage.jsx
    ├── ReportPreviewPage.jsx
    ├── ReportDownloadPage.jsx
    └── ReportExport.css

user-frontend/
└── src/user/api/
    └── reportExportApi.js

global/
└── file response, exception handling, auth context, route guard
```

## Phases

- [ ] Phase 1: 통합 데이터 구조 설계 — Document Analysis, Interview, Career History 결과를 PDF 생성용 DTO로 매핑하는 구조를 정의한다.
- [ ] Phase 2: 백엔드 PDF 생성 흐름 설계 — ReportExport 엔티티, DTO, 상태 타입, 다운로드 응답 구조를 작성한다.
- [ ] Phase 3: PDF 생성 및 다운로드 API 구현 — 종합 리포트 생성, 미리보기 데이터 조회, PDF 다운로드 API를 구현한다.
- [ ] Phase 4: 프론트엔드 리포트 화면 구현 — PDF 미리보기 화면, 리포트 생성 버튼, 다운로드 버튼, 오류 안내 UI를 구현한다.
- [ ] Phase 5: 문서화 & 테스트 — Swagger 문서화, mock data 테스트, PDF 생성 테스트, 다운로드 테스트, 브라우저 렌더링 테스트를 진행한다.