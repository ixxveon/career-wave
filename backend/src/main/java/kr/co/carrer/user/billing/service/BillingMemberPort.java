package kr.co.carrer.user.billing.service;

import kr.co.carrer.global.exception.CustomException;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public interface BillingMemberPort {

    boolean isEligibleForBilling(UUID memberId);

    record MemberBillingInfo(String name, String email) {}

    MemberBillingInfo getMemberBillingInfo(UUID memberId);

    // 자동결제 배치 선로딩용 — 여러 회원의 결제 정보를 IN 절로 한 번에 조회.
    // email이 없는(부적격) 회원은 결과에서 제외 → 호출측에서 부재로 처리.
    // 기본 구현은 건별 조회 폴백이며, 실 구현(BillingMemberPortImpl)이 IN 절 배치로 오버라이드한다.
    default Map<UUID, MemberBillingInfo> getMemberBillingInfoBatch(Collection<UUID> memberIds) {
        Map<UUID, MemberBillingInfo> result = new HashMap<>();
        for (UUID memberId : memberIds) {
            try {
                result.put(memberId, getMemberBillingInfo(memberId));
            } catch (CustomException ignored) {
                // 부적격 회원(미존재/이메일 없음)만 제외 — 인프라 예외는 전파
            }
        }
        return result;
    }

    void markPremium(UUID memberId);

    // 구독이 만료/취소됐을 때 호출 — 다른 유효 구독이 없는 경우에만 FREE로 내린다
    void markFreeIfNoActivePlan(UUID memberId);
}
