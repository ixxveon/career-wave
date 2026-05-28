# Tasks: 채용 공고 (JobNotice)

## Phase 1 - Foundational
- [ ] JobNotice 엔티티 BaseTimeEntity 상속 적용
- [ ] Company FK 연관관계 확인

## Phase 2 - P1 목록/승인
- [ ] JobNoticeListResponse DTO 작성
- [ ] JobNoticeService.getJobNotices(status, source, pageable) 구현
- [ ] JobNoticeService.publish(id) / reject(id) 구현
- [ ] GET /api/admin/job-notices
- [ ] PATCH /api/admin/job-notices/{id}/publish
- [ ] PATCH /api/admin/job-notices/{id}/reject

## Phase 3 - P2 크롤링 이관
- [ ] JobNoticeService.importCrawled() 구현
- [ ] POST /api/admin/job-notices/import-crawled

## Phase 4 - Polish
- [ ] JobNoticeDocs 인터페이스 작성 (Swagger)
- [ ] 통합 테스트 작성
