# Implementation Plan: JobNotice User Backend

**Version**: v1
**Status**: Draft

---

## Summary

> 사용자 채용 공고 목록/상세 조회와 북마크 등록/해제 기능을 Spring Boot 기준으로 구현한다.

---

## Technical Context

- Spring Boot 3.x / Java 21
- Spring Data JPA
- Spring Security with JWT (`ROLE_USER`)
- PostgreSQL
- `ApiResponse<T>` 공통 응답 래퍼
- `CustomException` / `ErrorCode` / `GlobalExceptionHandler`
- Swagger annotation 분리 (`docs` 인터페이스)
- 외부 API 기준 페이지 번호 1-based, 내부 Pageable 변환 시 `page - 1`

---

## Project Structure

```text
user/jobNotice/
  controller/   UserJobNoticeController.java
  service/      UserJobNoticeService.java
                impl/UserJobNoticeServiceImpl.java
  repository/   JobNoticeRepository.java
                BookmarkRepository.java
  entity/       JobNotice.java
                Bookmark.java
  dto/          JobNoticeDTO.java
  exception/    JobNoticeErrorCode.java
  type/         JobNoticeStatus.java
                JobType.java
                CompanySize.java
                CareerLevel.java
  docs/         UserJobNoticeControllerDocs.java

global/
  exception/    CustomException.java
                ErrorCode.java
                GlobalExceptionHandler.java
  response/     ApiResponse.java
```

---

## Phases

### Phase 1: Entity 정의

ERD 기준으로 JobNotice와 Bookmark 엔티티 및 Enum 구조를 먼저 고정한다.

- [ ] `JobNoticeStatus`, `JobType`, `CompanySize`, `CareerLevel` Enum 정의
- [ ] `JobNotice` Entity 정의
- [ ] `Bookmark` Entity 정의

### Phase 2: Repository 구현

공개 공고 조회와 북마크 중복 검증/삭제에 필요한 저장소 계약을 구현한다.

- [ ] `JobNoticeRepository` 구현
- [ ] `BookmarkRepository` 구현
- [ ] 목록 조회 필터, 정렬, 페이지네이션 쿼리 반영

### Phase 3: Service 구현

공개 상태 필터, Optional 인증 응답 차이, 북마크 비즈니스 규칙을 서비스 계층에 구현한다.

- [ ] `UserJobNoticeService` 인터페이스 정의
- [ ] `UserJobNoticeServiceImpl` 목록 조회 구현
- [ ] `UserJobNoticeServiceImpl` 상세 조회 구현
- [ ] `UserJobNoticeServiceImpl` 북마크 등록 구현
- [ ] `UserJobNoticeServiceImpl` 북마크 해제 구현
- [ ] `global.exception.ErrorCode`와 `jobNotice.exception.JobNoticeErrorCode` 역할 분리 반영

### Phase 4: API 구현

사용자 JobNotice API 엔드포인트와 인증/권한 적용을 완성한다.

- [ ] `GET /api/v1/user/job-notices`
- [ ] `GET /api/v1/user/job-notices/{jobNoticeId}`
- [ ] `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks`
- [ ] `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks`

### Phase 5: 문서화

Swagger 문서와 API 계약 문서를 구현 결과와 일치하도록 정리한다.

- [ ] `UserJobNoticeControllerDocs` 작성
- [ ] `api-schema.md`와 DTO 계약 일치 여부 점검
- [ ] Service 인터페이스/구현체 구조 반영 여부 점검
- [ ] 공통 ErrorCode와 도메인 ErrorCode 분리 반영 여부 점검
- [ ] `spec.md`, `constitution.md`와 구현 범위 일치 여부 점검

### Phase 6: 테스트

공개 노출 규칙, 북마크 권한, 예외 응답, 페이지네이션 계약을 검증한다.

- [ ] 목록 조회 테스트
- [ ] 상세 조회 테스트
- [ ] 북마크 등록/해제 테스트
- [ ] 인증/권한 테스트
- [ ] `ApiResponse<T>` 및 `ErrorCode` 검증

---

## 권장 개발 순서

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
```

공고 노출 규칙과 북마크 관계가 핵심이므로 엔티티와 저장소 계약을 먼저 고정한 뒤 서비스 규칙과 API 계약을 올리는 순서가 가장 안정적이다.
