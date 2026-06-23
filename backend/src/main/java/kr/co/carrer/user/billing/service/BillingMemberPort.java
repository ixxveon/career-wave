package kr.co.carrer.user.billing.service;

import java.util.UUID;

public interface BillingMemberPort {

    boolean isEligibleForBilling(UUID memberId);
}
