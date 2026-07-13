package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.Subscription;

import java.util.List;
import java.util.function.ToIntFunction;

public interface SubscriptionRenewalService {

    void processRenewal(Subscription subscription, int attemptSequence);

    /**
     * 자동결제 대상 구독을 배치 처리한다.
     * - 루프 밖에서 plan/profile/회원정보/멱등결제를 일괄 선로딩(N+1 제거)
     * - bounded 스레드풀로 건별 처리를 병렬화(멱등키 기반 안전)
     *
     * @param subscriptions          처리 후보 구독
     * @param attemptSequenceResolver 구독별 attemptSequence. 음수면 스킵(대상 아님)
     * @return 성공 처리 건수
     */
    int processDueBatch(List<Subscription> subscriptions, ToIntFunction<Subscription> attemptSequenceResolver);
}
