package kr.co.carrer.user.billing.service;

import java.util.UUID;

public interface BillingMemberPort {

    boolean isEligibleForBilling(UUID memberId);

    record MemberBillingInfo(String name, String email) {}

    MemberBillingInfo getMemberBillingInfo(UUID memberId);

    void markPremium(UUID memberId);

    // 구독이 만료/취소됐을 때 호출 — 다른 유효 구독이 없는 경우에만 FREE로 내린다
    void markFreeIfNoActivePlan(UUID memberId);
}
