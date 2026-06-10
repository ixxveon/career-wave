package kr.co.carrer.user.member.dto;

import kr.co.carrer.user.member.dto.CompanyApprovalStatus;
import kr.co.carrer.user.member.dto.MemberStatus;
import kr.co.carrer.user.member.dto.RoleType;
import kr.co.carrer.user.member.dto.SubscriptionStatus;

import java.time.Instant;
import java.util.UUID;

public record MemberSummary(
        UUID memberId,
        String loginId,
        String name,
        String memberType,
        String memberStatus,
        String subscriptionStatus,
        String companyApprovalStatus,
        Instant lastLoginAt
) {
    public static MemberSummary of(UUID memberId, String loginId, String name,
                                   RoleType roleType, MemberStatus memberStatus,
                                   SubscriptionStatus subscriptionStatus,
                                   CompanyApprovalStatus companyApprovalStatus,
                                   Instant lastLoginAt) {
        return new MemberSummary(
                memberId, loginId, name,
                roleType == RoleType.ROLE_USER ? "USER" : "COMPANY",
                memberStatus.name(),
                subscriptionStatus.name(),
                companyApprovalStatus.name(),
                lastLoginAt
        );
    }
}
