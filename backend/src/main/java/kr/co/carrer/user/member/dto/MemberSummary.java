package kr.co.carrer.user.member.dto;

import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;

import java.time.Instant;
import java.util.UUID;

public record MemberSummary(
        UUID memberId,
        String loginId,
        String name,
        String memberType,
        String memberStatus,
        String companyApprovalStatus,
        Instant lastLoginAt
) {
    public static MemberSummary of(UUID memberId, String loginId, String name,
                                   RoleType roleType, MemberStatus memberStatus,
                                   CompanyApprovalStatus companyApprovalStatus,
                                   Instant lastLoginAt) {
        return new MemberSummary(
                memberId, loginId, name,
                roleType == RoleType.ROLE_USER ? "USER" : "COMPANY",
                memberStatus.name(),
                companyApprovalStatus.name(),
                lastLoginAt
        );
    }
}
