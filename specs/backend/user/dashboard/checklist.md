# Checklist: 사용자 대시보드

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 생성 전에 작성자가 직접 확인한다.

---

## Phase 1 — API 계약 검증

* [ ] spec.md 기능 범위와 구현 범위가 일치하는지 확인
* [ ] api-schema.md 요청/응답 구조와 실제 DTO 구조가 일치하는지 확인
* [ ] 사용자 API 경로가 `/api/v1/user/dashboard` 기준을 따르는지 확인
* [ ] ERD 사용 테이블(`members`, `personal_profiles`, `bookmarks`, `job_notices`) 확인
* [ ] v1 범위와 v2 범위가 명확히 구분되어 있는지 확인

---

## Phase 2 — DTO 및 응답 구조 검증

* [ ] DashboardDTO Request 구조 정의 확인
* [ ] DashboardDTO Response 구조 정의 확인
* [ ] Entity를 API 응답으로 직접 반환하지 않는지 확인
* [ ] ApiResponse<T> 응답 형식 적용 확인
* [ ] 응답 필드(`success`, `statusCode`, `message`, `data`) 적용 확인
* [ ] DTO 필드명이 API Schema와 일치하는지 확인

---

## Phase 3 — 내 정보 및 GitHub 조회 검증

* [ ] 로그인 사용자 기준 데이터 조회 확인
* [ ] Member 정보 조회 정상 동작 확인
* [ ] PersonalProfile 정보 조회 정상 동작 확인
* [ ] GitHub URL 등록 상태 조회 확인
* [ ] GitHub URL 미등록 상태 조회 확인
* [ ] linked 값 계산 규칙 확인
* [ ] 존재하지 않는 회원 조회 예외 처리 확인

---

## Phase 4 — 회원 정보 수정 검증

* [ ] 회원 정보 수정 API 동작 확인
* [ ] 이름 수정 기능 확인
* [ ] 휴대폰 번호 수정 기능 확인
* [ ] GitHub URL 수정 기능 확인
* [ ] 입력값 검증 로직 확인
* [ ] 본인 데이터만 수정 가능한지 확인
* [ ] 수정 후 재조회 시 변경 데이터 반영 확인

---

## Phase 5 — 스크랩 공고 API 검증

* [ ] 스크랩 공고 목록 조회 확인
* [ ] 검색 기능 동작 확인
* [ ] 최신순 정렬 확인
* [ ] 페이지네이션 응답 확인
* [ ] Empty Response 확인
* [ ] 공고 상태(noticeStatus) 반환 확인
* [ ] noticeStatus 응답 정책 확인
* [ ] 스크랩 취소 기능 확인
* [ ] 본인 소유 스크랩만 취소 가능한지 확인

---

## Phase 6 — 예외 처리 및 Swagger 검증

* [ ] ErrorCode 정의 확인
* [ ] CustomException 사용 확인
* [ ] RuntimeException 직접 생성 여부 확인
* [ ] Controller 내부 반복 try-catch 제거 확인
* [ ] DashboardControllerDocs 작성 확인
* [ ] Swagger 요청/응답 설명 검증
* [ ] 인증 실패 응답 확인
* [ ] 권한 실패 응답 확인

---

## Phase 7 — 테스트 및 최종 검증

* [ ] DashboardService 단위 테스트 작성 확인
* [ ] 내 정보 조회 테스트 확인
* [ ] GitHub 정보 조회 테스트 확인
* [ ] 회원 정보 수정 테스트 확인
* [ ] 스크랩 목록 조회 테스트 확인
* [ ] 마감(CLOSED) 공고 조회 테스트 확인
* [ ] 스크랩 취소 테스트 확인
* [ ] 본인 데이터 접근 검증 테스트 확인
* [ ] Gradle Build 성공 확인
* [ ] 테스트 코드 전체 통과 확인

---

## 코드 품질

* [ ] CareerWave Convention 준수 확인
* [ ] DTO Inner Class 규칙 준수 확인
* [ ] ApiResponse 규칙 준수 확인
* [ ] ErrorCode + CustomException 규칙 준수 확인
* [ ] Swagger Docs 분리 규칙 준수 확인
* [ ] Domain Boundary 위반 여부 확인
* [ ] Admin 도메인 직접 참조 여부 확인
* [ ] Entity 직접 반환 여부 확인

---

## 머지 전 최종 확인

* [ ] constitution.md 불변 규칙과 구현이 일치하는지 확인
* [ ] tasks.md 모든 항목 완료 확인
* [ ] 테스트 코드 작성 여부 확인
* [ ] Swagger 문서 확인
* [ ] PR 제목 형식 준수 확인
* [ ] CodeRabbit 리뷰 반영 확인
* [ ] Backend Build & Test 성공 확인
