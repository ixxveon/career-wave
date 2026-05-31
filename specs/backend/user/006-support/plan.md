# Plan: 사용자 고객센터 API (User Support)

**Feature Branch**: `feature/user-support-be-spec`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 완료 / 구현 예정

---

## Summary

회원이 공지사항·FAQ를 조회하고 1:1 문의를 접수·확인하는 사용자 고객센터 REST API.
notices, faqs, inquiries 테이블은 admin/cs와 공유하며, user/support는 조회·접수 전용.

**Entity 공유 전략 (우선 적용):**
현재 admin/cs에 `admin/cs/entity/` 패키지에 Notice, Faq, Inquiry Entity가 정의되어 있다.
user/support에서 직접 참조할 수 없으므로 아래 방식 중 하나로 결정한다:

- **Option A (권장)**: `domain/notice/`, `domain/faq/`, `domain/inquiry/` 공통 패키지로 Entity 이동, admin/cs와 user/support 모두 공통 패키지 참조
- **Option B**: user/support 전용 Repository에서 JPQL로 직접 테이블 접근 (Entity 미사용)

구현 착수 전 admin 담당자와 협의 필요.

---

## Technical Context

- Spring Boot + JPA 기반 사용자 백엔드
- 패키지: `user/support/`
- API 계약: `specs/backend/user/006-support/api-schema.md`
- 공지·FAQ: 비인증 허용 (`permitAll()`)
- 문의: JWT + USER 권한 필수
- `admin/cs/` 직접 참조 금지 (CONVENTION.md)

---

## Phases

- [ ] Phase 1: DTO 정의 — `SupportDTO.java` inner class 6종
- [ ] Phase 2: Service 구현 — UserNoticeService / UserFaqService / UserInquiryService
- [ ] Phase 3: Controller & Swagger Docs
- [ ] Phase 4: Security 설정 — 공지·FAQ `permitAll()`, 문의 `hasRole('USER')`
- [ ] Phase 5: ErrorCode 등록 & 검증
