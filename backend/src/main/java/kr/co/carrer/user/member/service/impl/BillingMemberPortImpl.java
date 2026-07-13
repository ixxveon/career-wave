package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.type.MemberStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static kr.co.carrer.user.member.type.SubscriptionStatus.FREE;
import static kr.co.carrer.user.member.type.SubscriptionStatus.PREMIUM;

@Service
@RequiredArgsConstructor
public class BillingMemberPortImpl implements BillingMemberPort {

    private final UserMemberRepository memberRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Override
    @Transactional(readOnly = true)
    public boolean isEligibleForBilling(UUID memberId) {
        return memberRepository.findById(memberId)
                .map(Member::getMemberStatus)
                .map(status -> status == MemberStatus.ACTIVE)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberBillingInfo getMemberBillingInfo(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.ACCOUNT_NOT_ELIGIBLE));
        if (member.getEmail() == null || member.getEmail().isBlank()) {
            throw new CustomException(BillingErrorCode.BILLING_EMAIL_REQUIRED);
        }
        return new MemberBillingInfo(member.getName(), member.getEmail());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, MemberBillingInfo> getMemberBillingInfoBatch(Collection<UUID> memberIds) {
        // email 없는 회원은 제외 → 배치 호출측에서 memberInfo 부재로 부적격 처리
        return memberRepository.findAllById(memberIds).stream()
                .filter(m -> m.getEmail() != null && !m.getEmail().isBlank())
                .collect(Collectors.toMap(
                        Member::getMemberId,
                        m -> new MemberBillingInfo(m.getName(), m.getEmail())));
    }

    @Override
    @Transactional
    public void markPremium(UUID memberId) {
        memberRepository.findById(memberId).ifPresent(m -> m.updateSubscriptionStatus(PREMIUM));
    }

    @Override
    @Transactional
    public void markFreeIfNoActivePlan(UUID memberId) {
        boolean hasActiveSub = subscriptionRepository.existsByMemberIdAndSubscriptionStatusIn(
                memberId, Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCEL_SCHEDULED));
        if (!hasActiveSub) {
            memberRepository.findById(memberId).ifPresent(m -> m.updateSubscriptionStatus(FREE));
        }
    }
}
