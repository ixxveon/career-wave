# Checklist: [도메인명]

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — 엔티티 & 레포지토리

- [ ] 엔티티 필드 및 제약조건 (unique, not null 등) 적용 확인
- [ ] 필요한 enum 타입 정의
- [ ] 필요한 Repository 쿼리 메서드 구현

## Phase 2 — 핵심 API (P1)

> tasks.md의 Phase에 맞춰 항목을 채운다.

- [ ] 엔드포인트 구현
- [ ] 정상 케이스 응답: `ApiResponse<T>` 래퍼 사용 확인
- [ ] 예외 케이스: `ErrorCode.XXX` 매핑 확인

## Phase 3 — 부가 API (P2)

- [ ] 엔드포인트 구현
- [ ] 응답 형식 확인

## Phase N — 문서화 & 테스트

- [ ] `XxxDocs` 인터페이스 작성 (Swagger 어노테이션 분리)
- [ ] Controller에 Swagger 어노테이션 직접 없음 확인
- [ ] 정상 케이스 통합 테스트
- [ ] 예외/경계 케이스 단위 테스트

## 코드 품질

- [ ] `ApiResponse<T>` 래퍼 누락 엔드포인트 없음
- [ ] `BusinessException(ErrorCode.XXX)` 패턴 준수 (컨트롤러에서 직접 `ResponseEntity` 반환 금지)
- [ ] 비즈니스 로직이 서비스 레이어에만 존재
- [ ] `global/` → `domain/` 참조 없음 확인

## 머지 전 최종 확인

- [ ] `contracts/api-spec.json` 실제 구현과 일치
- [ ] constitution.md 불변 규칙과 실제 구현 일치 확인
- [ ] PR 제목 형식 준수: `[NNN] 도메인명 API 구현`
- [ ] tasks.md 모든 항목 완료 체크
