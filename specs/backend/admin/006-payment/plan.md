# Plan: 결제·정산 관리 API (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-be-spec`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 완료 / 구현 예정

---

## Summary

결제 내역 조회, 환불 처리 확정·불가, 구독 현황 조회 어드민 REST API.
Toss Payments 환불 API 연동 포함. 정산 리포트는 v2 예정.
멘토 정산 기능 없음.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/payment/`
- API 계약: `specs/backend/admin/006-payment/api-schema.md`
- Toss Payments 환불 API: `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel`
- AI 이용 현황 조회 대상: `resume_analysis_logs`, `interview_logs` 테이블 (유료 건만 COUNT)

---

## Phases

- [ ] Phase 1: Enum & Entity 정의
- [ ] Phase 2: Repository 구현
- [ ] Phase 3: Service 구현
- [ ] Phase 4: Controller & Swagger Docs
- [ ] Phase 5: ErrorCode 등록 & 검증
