package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.Subscription;

public interface SubscriptionRenewalService {

    void processRenewal(Subscription subscription, int attemptSequence);
}
