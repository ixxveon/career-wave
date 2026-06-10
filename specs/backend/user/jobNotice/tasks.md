# Tasks: JobNotice User Backend

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 - Entity 정의

### Entity

- [ ] `JobNotice.java` 작성
- [ ] `Bookmark.java` 작성
- [ ] `JobNoticeStatus.java`, `JobType.java`, `CompanySize.java`, `CareerLevel.java` 작성

---

## Phase 2 - Repository 구현

### Repository

- [ ] `JobNoticeRepository.java` 작성
- [ ] 공개 공고 목록 조회 쿼리 구현 커밋 분리
- [ ] 공개 공고 상세 조회 쿼리 구현 커밋 분리
- [ ] `BookmarkRepository.java` 작성
- [ ] 북마크 중복 조회 및 삭제 쿼리 구현 커밋 분리

---

## Phase 3 - Service 구현

### Service

- [ ] `UserJobNoticeService.java` 인터페이스 작성
- [ ] `UserJobNoticeServiceImpl.java` 목록 조회 로직 작성
- [ ] `UserJobNoticeServiceImpl.java` 상세 조회 로직 작성
- [ ] `UserJobNoticeServiceImpl.java` 북마크 등록 로직 작성
- [ ] `UserJobNoticeServiceImpl.java` 북마크 해제 로직 작성
- [ ] `JobNoticeErrorCode.java` 작성
- [ ] 공통 `ErrorCode.java`와 도메인 `JobNoticeErrorCode.java` 예외 매핑 정리

---

## Phase 4 - API 구현

### Controller

- [ ] `UserJobNoticeController.java` 목록 조회 API 작성
- [ ] `UserJobNoticeController.java` 상세 조회 API 작성
- [ ] `UserJobNoticeController.java` 북마크 등록 API 작성
- [ ] `UserJobNoticeController.java` 북마크 해제 API 작성

---

## Phase 5 - 문서화

### Docs

- [ ] `JobNoticeDTO.java` 계약 정리
- [ ] `UserJobNoticeControllerDocs.java` 작성
- [ ] Swagger 요청/응답 및 ErrorCode 문서화 정리
- [ ] Service 인터페이스/구현체 구조 문서 반영
- [ ] 공통/도메인 ErrorCode 분리 문서 반영
- [ ] 프론트엔드 구계약 대비 breaking change 안내 문구 반영
- [ ] 프론트엔드 마이그레이션 후속 작업 항목 정리
- [ ] `api-schema.md` 구현 반영 정리

---

## Phase 6 - 테스트

### Test

- [ ] 공개 공고 목록 조회 테스트 작성
- [ ] 공개 공고 상세 조회 테스트 작성
- [ ] 비공개/미존재 공고 예외 테스트 작성
- [ ] 북마크 등록 테스트 작성
- [ ] 북마크 해제 테스트 작성
- [ ] 비로그인 북마크 차단 테스트 작성
- [ ] 중복 북마크 및 없는 북마크 해제 예외 테스트 작성
- [ ] `ApiResponse<T>` 응답 형식 테스트 작성
