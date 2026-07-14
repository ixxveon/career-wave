package kr.co.carrer.user.billing.service;

import kr.co.carrer.user.billing.entity.BillingProfile;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.UserPayment;

import java.util.Map;
import java.util.UUID;

/**
 * 자동결제 배치 1회 실행에서 미리 일괄 조회한 참조 데이터.
 * 건별 반복 조회(N+1)를 제거하기 위해 루프 밖에서 한 번에 로딩해 둔다.
 *
 * - plans           : planId → Plan
 * - profiles        : memberId → 최신 ACTIVE BillingProfile
 * - memberInfos     : memberId → 결제용 회원 정보(name/email)
 * - existingPayments: idempotencyKey → 이미 생성된 결제(있으면 재사용, 없으면 신규 생성)
 */
public class RenewalContext {

    private final Map<Long, Plan> plans;
    private final Map<UUID, BillingProfile> profiles;
    private final Map<UUID, BillingMemberPort.MemberBillingInfo> memberInfos;
    private final Map<String, UserPayment> existingPayments;

    public RenewalContext(Map<Long, Plan> plans,
                          Map<UUID, BillingProfile> profiles,
                          Map<UUID, BillingMemberPort.MemberBillingInfo> memberInfos,
                          Map<String, UserPayment> existingPayments) {
        this.plans = plans;
        this.profiles = profiles;
        this.memberInfos = memberInfos;
        this.existingPayments = existingPayments;
    }

    public Plan plan(Long planId) {
        return plans.get(planId);
    }

    public BillingProfile activeProfile(UUID memberId) {
        return profiles.get(memberId);
    }

    public BillingMemberPort.MemberBillingInfo memberInfo(UUID memberId) {
        return memberInfos.get(memberId);
    }

    // 없으면 null — 호출측이 createNew로 신규 생성
    public UserPayment existingPayment(String idempotencyKey) {
        return existingPayments.get(idempotencyKey);
    }
}
