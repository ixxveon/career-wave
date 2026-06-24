package kr.co.carrer.user.billing.service;

import java.util.UUID;

public interface BillingMemberPort {

    boolean isEligibleForBilling(UUID memberId);

    record MemberBillingInfo(String name, String email) {}

    MemberBillingInfo getMemberBillingInfo(UUID memberId);
}
