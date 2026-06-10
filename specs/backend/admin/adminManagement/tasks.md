# Tasks: adminManagement

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - Entity 정의

- [ ] `AdminRole.java`, `AdminStatus.java` 정의 — ERD의 CHECK 제약조건과 동일한 enum 값 반영
- [ ] `Admin.java` 작성 — `admins` 테이블 매핑, `adminRole`/`status`를 `EnumType.STRING`으로 관리
- [ ] `IpAcl.java` 작성 — `ip_acl` 테이블 매핑, `isEnabled` 운영 플래그와 감사용 시각 필드 반영
- [ ] `AuditLog.java` 작성 — `audit_logs` 테이블 매핑과 관리자 운영 이력 추적 필드 반영
- [ ] 엔티티 상태 변경 메서드 정리 — 관리자 잠금/해제, 권한 변경, ACL 활성/비활성 전환을 엔티티 책임 범위로 정리

## Phase 2 - Repository 구현

- [ ] `AdminRepository.java` 작성 — 관리자 목록 조회, 이메일 중복 확인, 마지막 `MASTER` 검증에 필요한 조회 메서드 구성
- [ ] `IpAclRepository.java` 작성 — ACL 목록 조회, `ipRange` 중복 확인, 활성 상태 변경 대상 조회 메서드 구성
- [ ] `AuditLogRepository.java` 작성 — 관리자 운영 변경 이력 저장용 영속화 인터페이스 구성
- [ ] 관리자 목록 페이지네이션 조회 쿼리 정리 — 외부 1-based 계약을 지원할 수 있는 정렬/검색 기준 반영
- [ ] ACL 목록 페이지네이션 조회 쿼리 정리 — 페이지네이션과 운영 목록 조회 기준 반영

## Phase 3 - Service 구현

- [ ] `AdminManagementService.java` 인터페이스 작성 — 관리자 계정/ACL 유스케이스 메서드 계약 정의
- [ ] `AdminManagementServiceImpl.java`에 관리자 KPI 요약 및 계정 목록 조회 구현
- [ ] `AdminManagementServiceImpl.java`에 관리자 계정 생성 구현 — 이메일 중복 검증과 권한 기본 규칙 반영
- [ ] `AdminManagementServiceImpl.java`에 관리자 권한 변경 구현 — 마지막 `MASTER` 보호 규칙 반영
- [ ] `AdminManagementServiceImpl.java`에 관리자 상태 변경 구현 — `ACTIVE`/`LOCKED` 전이와 마지막 `MASTER` 잠금 금지 반영
- [ ] `AdminManagementServiceImpl.java`에 관리자 계정 삭제 구현 — 마지막 `MASTER` 삭제 금지와 미존재 예외 처리 반영
- [ ] `AdminManagementServiceImpl.java`에 ACL 목록 조회 구현 — `MASTER`, `BACKEND` 권한 범위 반영
- [ ] `AdminManagementServiceImpl.java`에 ACL 등록 구현 — `ipRange` 중복 검증과 필드 규칙 반영
- [ ] `AdminManagementServiceImpl.java`에 ACL 활성/비활성 변경 구현 — `isEnabled` 전환과 미존재 예외 처리 반영
- [ ] `AdminManagementServiceImpl.java`에 ACL 삭제 구현 — 미존재 예외 처리와 운영 삭제 규칙 반영
- [ ] 관리자 계정 및 ACL 주요 변경 시 감사 로그 기록 연계 구현
- [ ] `AdminManagementErrorCode.java` 작성 및 도메인 전용 ErrorCode 설계 — 공통 `global.exception.ErrorCode`와 분리하여 Service 예외 매핑 정리

## Phase 4 - API 구현

- [ ] `AdminManagementDTO.java` 작성 — 관리자 KPI 요약, 관리자 목록, 관리자 생성/권한 변경/상태 변경 요청·응답 계약 정의
- [ ] `AdminAclDTO.java` 작성 — ACL 목록, ACL 등록, ACL 활성/비활성 요청·응답 계약 정의
- [ ] `AdminManagementController.java` 작성 — 관리자 계정/ACL 엔드포인트와 `ApiResponse` 반환 구조 구현
- [ ] `AdminManagementDocs.java` 작성 — Swagger 어노테이션을 Controller에서 분리
- [ ] JWT 기반 인증/인가 및 `MASTER`/`BACKEND` 역할 접근 제어를 API 진입점에 연결

## Phase 5 - 문서화

- [ ] `api-schema.md`와 실제 요청/응답 DTO 필드 명칭 일치 여부 점검
- [ ] 관리자 계정/ACL API의 ErrorCode 목록과 실패 조건 문서 정리
- [ ] Swagger 문서가 docs 인터페이스 기준으로 분리되어 노출되는지 점검
- [ ] `ApiResponse` 래퍼와 페이지네이션 응답 형식(`content`, `page`, `size`, `totalElements`, `totalPages`) 문서 일치 여부 정리

## Phase 6 - 테스트

- [ ] 관리자 계정 생성/권한 변경/상태 변경/삭제 서비스 테스트 작성
- [ ] 마지막 `MASTER` 보호 규칙 테스트 작성 — 권한 변경, 잠금, 삭제 차단 검증
- [ ] ACL 등록/활성화 변경/삭제 서비스 테스트 작성
- [ ] 이메일 중복 및 `ipRange` 중복 예외 테스트 작성
- [ ] 권한 분기 테스트 작성 — `MASTER`, `BACKEND`별 허용/거부 검증
- [ ] Controller/API 테스트 작성 — `ApiResponse` 구조와 1-based 페이지네이션 응답 검증
- [ ] 감사 로그 연계 동작 테스트 작성 — 주요 관리자 운영 변경 시 기록 생성 검증
