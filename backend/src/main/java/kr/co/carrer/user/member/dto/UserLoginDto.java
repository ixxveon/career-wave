package kr.co.carrer.user.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.MemberType;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

public class UserLoginDto {

    @Getter
    public static class Request {
        @NotBlank private final String loginId;
        @NotBlank private final String password;
        @NotNull  private final MemberType roleType;

        public Request(String loginId, String password, MemberType roleType) {
            this.loginId = loginId;
            this.password = password;
            this.roleType = roleType;
        }
    }

    @Getter
    public static class Response {
        private final String accessToken;
        private final MemberInfo member;

        public Response(String accessToken, MemberInfo member) {
            this.accessToken = accessToken;
            this.member = member;
        }
    }

    public record TokenRefreshResponse(String accessToken) {}

    @Getter
    public static class MemberInfo {
        private final UUID memberId;
        private final String loginId;
        private final String name;
        private final String roleType;
        private final String memberStatus;
        private final String subscriptionStatus;
        private final String companyApprovalStatus;
        private final Instant lastLoginAt;

        public MemberInfo(UUID memberId, String loginId, String name,
                          String roleType, String memberStatus,
                          String subscriptionStatus, String companyApprovalStatus,
                          Instant lastLoginAt) {
            this.memberId = memberId;
            this.loginId = loginId;
            this.name = name;
            this.roleType = roleType;
            this.memberStatus = memberStatus;
            this.subscriptionStatus = subscriptionStatus;
            this.companyApprovalStatus = companyApprovalStatus;
            this.lastLoginAt = lastLoginAt;
        }

        public static MemberInfo of(UUID memberId, String loginId, String name,
                                    RoleType roleType, MemberStatus memberStatus,
                                    SubscriptionStatus subscriptionStatus,
                                    CompanyApprovalStatus companyApprovalStatus,
                                    Instant lastLoginAt) {
            return new MemberInfo(
                    memberId, loginId, name,
                    roleType == RoleType.USER ? "USER" : "COMPANY",
                    memberStatus.name(),
                    subscriptionStatus.name(),
                    companyApprovalStatus.name(),
                    lastLoginAt
            );
        }
    }
}
