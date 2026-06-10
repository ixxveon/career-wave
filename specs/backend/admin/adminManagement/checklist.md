# Checklist: adminManagement

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — Entity & Repository

- [ ] `Admin`, `IpAcl`, `AuditLog` 엔티티 필드가 ERD 컬럼명, null 허용 여부, unique 제약과 일치하는가
- [ ] `AdminRole`, `AdminStatus` enum 값이 ERD CHECK 제약조건(`MASTER`, `CS`, `BACKEND` / `ACTIVE`, `LOCKED`)과 일치하는가
- [ ] JPA enum 필드가 `EnumType.STRING`으로 매핑되어 있는가
- [ ] `AdminRepository`에 이메일 중복 확인과 마지막 `MASTER` 검증에 필요한 조회 메서드가 구현되어 있는가
- [ ] `IpAclRepository`에 `ipRange` 중복 확인과 ACL 목록 페이지네이션 조회 메서드가 구현되어 있는가
- [ ] `AuditLogRepository`가 관리자 운영 변경 이력 저장 용도로 연결되어 있는가

## Phase 2 — 핵심 API (P1)

- [ ] `GET /api/v1/admin/admins/summary`가 구현되어 있고 `MASTER` 권한으로만 접근 가능한가
- [ ] `GET /api/v1/admin/admins`가 구현되어 있고 관리자 목록을 페이지네이션으로 반환하는가
- [ ] `POST /api/v1/admin/admins`가 구현되어 있고 이메일 중복 시 도메인 ErrorCode를 반환하는가
- [ ] `PATCH /api/v1/admin/admins/{adminId}/role`이 구현되어 있고 마지막 `MASTER` 보호 규칙을 검증하는가
- [ ] `PATCH /api/v1/admin/admins/{adminId}/status`가 구현되어 있고 `ACTIVE`/`LOCKED` 상태 전이를 검증하는가
- [ ] `DELETE /api/v1/admin/admins/{adminId}`가 구현되어 있고 마지막 `MASTER` 삭제 금지 규칙을 검증하는가
- [ ] `GET /api/v1/admin/admin-acls`가 구현되어 있고 `MASTER`, `BACKEND` 권한으로만 조회 가능한가
- [ ] `POST /api/v1/admin/admin-acls`가 구현되어 있고 `ipRange` 중복 시 도메인 ErrorCode를 반환하는가
- [ ] `PATCH /api/v1/admin/admin-acls/{aclId}/enabled`가 구현되어 있고 `isEnabled` 값 변경이 반영되는가
- [ ] `DELETE /api/v1/admin/admin-acls/{aclId}`가 구현되어 있고 존재하지 않는 `aclId`에 대해 도메인 ErrorCode를 반환하는가
- [ ] 핵심 API 정상 응답이 모두 `ApiResponse<T>` 규격을 사용하는가
- [ ] 목록 응답이 모두 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족하는가

## Phase 3 — 부가 규칙 & 운영 안전장치 (P2)

- [ ] 마지막 `MASTER` 계정의 권한 변경, 잠금, 삭제 요청이 모두 차단되는가
- [ ] 존재하지 않는 `adminId`, `aclId` 요청이 모두 일관된 도메인 ErrorCode로 처리되는가
- [ ] 허용되지 않은 `adminRole`, `status` 요청 값이 검증 오류로 처리되는가
- [ ] 관리자 계정 및 ACL 주요 변경 시 감사 로그가 기록되는가
- [ ] 운영 변경 비즈니스 로직이 Controller나 Repository가 아니라 Service 레이어에만 존재하는가

## Phase 4 — 문서화 & 테스트

- [ ] `AdminManagementDocs` 인터페이스가 작성되어 있고 Swagger 어노테이션이 Controller에서 분리되어 있는가
- [ ] Controller에 Swagger 어노테이션이 직접 작성되어 있지 않은가
- [ ] `api-schema.md`의 엔드포인트, 요청/응답 필드 명칭, 권한 정책이 실제 구현과 일치하는가
- [ ] 도메인 전용 ErrorCode가 `global.exception.ErrorCode`와 분리되어 관리되는가
- [ ] 공통 예외와 도메인 예외가 `GlobalExceptionHandler`를 통해 일관된 `ApiResponse` 실패 응답으로 변환되는가
- [ ] 서비스 테스트에서 관리자 생성/권한 변경/상태 변경/삭제, ACL 등록/변경/삭제가 검증되는가
- [ ] 테스트에서 이메일 중복, `ipRange` 중복, 미존재 리소스, 마지막 `MASTER` 보호 규칙이 검증되는가
- [ ] API 테스트에서 1-based page 입력이 내부 Pageable 변환 후 올바른 응답 구조로 반환되는가
- [ ] FastAPI 연동 코드, FastAPI 호출, FastAPI 의존 설정이 본 도메인 구현에 포함되어 있지 않은가

## 코드 품질

- [ ] `ApiResponse<T>` 래퍼를 사용하지 않는 관리자 관리 엔드포인트가 없는가
- [ ] `CustomException` + `ErrorCode` 패턴을 사용하며 `new RuntimeException(...)` 직접 생성이 없는가
- [ ] 비즈니스 로직이 Service 인터페이스/Impl을 중심으로 구성되고 Controller는 요청 바인딩과 응답 반환에만 집중하는가
- [ ] Repository에서 벌크 업데이트나 직접 상태 변경으로 `Admin.status`, `Admin.adminRole`, `IpAcl.isEnabled`를 우회 수정하지 않는가

## 머지 전 최종 확인

- [ ] `spec.md`, `constitution.md`, `plan.md`, `tasks.md`의 요구사항과 실제 구현이 충돌하지 않는가
- [ ] constitution.md의 불변 규칙(이메일 유일성, `ipRange` 유일성, 마지막 `MASTER` 보호)이 구현과 테스트에 반영되었는가
- [ ] tasks.md의 모든 작업 항목이 완료되었는가
