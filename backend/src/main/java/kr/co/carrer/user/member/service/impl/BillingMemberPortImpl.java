package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.type.MemberStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingMemberPortImpl implements BillingMemberPort {

    private final UserMemberRepository memberRepository;

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
        return new MemberBillingInfo(member.getName(), member.getEmail());
    }
}
