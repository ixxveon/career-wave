# Implementation Plan: 채용 공고 (JobNotice)

## Summary
기업 직접 등록 공고 관리 및 크롤링 공고 이관 API 구현.

## Technical Context
- JobNoticeSource: DIRECT / CRAWLED
- JobNoticeStatus: DRAFT → PUBLISHED / REJECTED / CLOSED

## Project Structure

```
domain/jobnotice/
├── controller/   JobNoticeController.java
├── service/      JobNoticeService.java
├── repository/   JobNoticeRepository.java
├── entity/       JobNotice.java
├── dto/          JobNoticeListResponse.java, JobNoticeDetailResponse.java
├── type/         JobNoticeStatus.java, JobNoticeSource.java
└── docs/         JobNoticeDocs.java
```

## Phases
- [ ] Phase 1: JobNotice 엔티티 완성
- [ ] Phase 2: 조회/승인/반려 서비스 구현
- [ ] Phase 3: 크롤링 이관 서비스 구현
- [ ] Phase 4: REST API 컨트롤러 구성
- [ ] Phase 5: Swagger 문서화
