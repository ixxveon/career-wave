# Tasks: 사용자 대시보드

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

---

## Phase 1 — API 계약 정리

* [ ] `spec.md` 기준 사용자 대시보드 백엔드 기능 범위 확인
* [ ] `api-schema.md` 기준 엔드포인트, 요청값, 응답값 검토
* [ ] 사용자 API Base URL을 `/api/v1/user/dashboard` 기준으로 정리
* [ ] 프론트 Dashboard API 계약과 백엔드 API 경로 차이 확인
* [ ] v1 범위와 v2 범위 구분 확인
* [ ] ERD 기준 사용 테이블 확인 (`members`, `personal_profiles`, `bookmarks`, `job_notices`)

## Phase 2 — DTO 및 응답 구조 설계

* [ ] `DashboardDTO.java` 단일 파일 기준 Request/Response DTO 구조 설계
* [ ] 내 정보 조회 응답 DTO 구조 정의
* [ ] GitHub 정보 조회 응답 DTO 구조 정의
* [ ] 회원 정보 수정 요청/응답 DTO 구조 정의
* [ ] 스크랩 공고 목록 조회 응답 DTO 구조 정의
* [ ] 스크랩 취소 응답 DTO 구조 정의
* [ ] 모든 응답이 `ApiResponse<T>` 형식을 따르는지 검토
* [ ] Entity를 API 응답으로 직접 반환하지 않도록 검토

## Phase 3 — 내 정보 및 GitHub 정보 조회 API 설계

* [ ] 로그인 사용자 식별 방식 검토
* [ ] `members` 테이블 기반 회원 기본 정보 조회 흐름 정의
* [ ] `personal_profiles` 테이블 기반 프로필 정보 조회 흐름 정의
* [ ] GitHub URL 존재 여부 기반 `linked` 값 산출 규칙 정의
* [ ] GitHub URL 미등록 상태 응답 구조 정의
* [ ] GitHub ID는 v1 범위에서 null 허용 또는 미제공 처리 기준 명시
* [ ] 회원 또는 프로필 정보가 없을 때 ErrorCode 처리 기준 정의

## Phase 4 — 회원 정보 수정 API 설계

* [ ] 회원 정보 수정 API 경로 정의 (`PATCH /api/v1/user/dashboard/profile`)
* [ ] 수정 가능 필드 범위 정의 (`name`, `phone`, `githubUrl`)
* [ ] 이름 필수 입력 검증 기준 정의
* [ ] 휴대폰 번호 형식 검증 기준 정의
* [ ] GitHub URL 형식 검증 기준 정의
* [ ] 본인 프로필만 수정 가능하도록 검증 기준 정의
* [ ] 수정 성공 응답 구조 정의
* [ ] 입력값 검증 실패 시 ErrorCode 처리 기준 정의

## Phase 5 — 스크랩 공고 API 설계

* [ ] 스크랩 공고 목록 조회 API 경로 정의
* [ ] 검색어(`keyword`) 기준 검색 조건 정의
* [ ] 최신순(`LATEST`) 정렬 기준 정의
* [ ] 페이지네이션 요청/응답 구조 정의
* [ ] `bookmarks`와 `job_notices` 기준 데이터 조회 흐름 정의
* [ ] 삭제된 채용공고 표시 정책 정의
* [ ] 스크랩 목록 Empty Response 구조 정의
* [ ] 스크랩 취소 API 경로 정의
* [ ] 본인 소유 스크랩만 취소 가능하도록 검증 기준 정의
* [ ] 스크랩 취소 성공 및 실패 응답 구조 정의

## Phase 6 — 예외 처리 및 Swagger 문서화

* [ ] Dashboard 도메인 ErrorCode 후보 정의
* [ ] `CustomException` 기반 예외 처리 흐름 정의
* [ ] Controller 내부 반복 `try-catch` 금지 규칙 반영
* [ ] `RuntimeException` 직접 생성 금지 규칙 반영
* [ ] `DashboardControllerDocs.java` 기준 Swagger 문서 분리 계획 작성
* [ ] Spec 문서와 Swagger 요청/응답 설명이 일치하는지 검토
* [ ] 인증/인가 실패 응답 처리 기준 검토

## Phase 7 — 테스트 및 검증

* [ ] DashboardService 단위 테스트 범위 정의
* [ ] 내 정보 조회 성공/실패 테스트 케이스 정의
* [ ] GitHub 정보 조회 linked/unlinked 테스트 케이스 정의
* [ ] 회원 정보 수정 성공/검증 실패 테스트 케이스 정의
* [ ] 스크랩 목록 조회 성공/Empty/검색 결과 없음 테스트 케이스 정의
* [ ] 삭제된 채용공고 포함 목록 조회 테스트 케이스 정의
* [ ] 스크랩 취소 성공/존재하지 않는 스크랩/타인 스크랩 접근 테스트 케이스 정의
* [ ] 빌드 및 테스트 실행 명령 확인
