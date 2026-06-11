package kr.co.carrer.user.member.dto;

import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;

import java.time.Instant;
import java.util.UUID;

public class MemberStatusDto {

    public record Response(
            UUID memberId,
            RoleType roleType,
            MemberStatus memberStatus,
            CompanyApprovalStatus companyApprovalStatus,
            Restriction restriction
    ) {}

    /**
     * ACTIVE 회원이면 null.
     * recoverable: SUSPENDED/LOCKED=true, BANNED/WITHDRAWN=false
     * availableAt: LOCKED=locked_until, SUSPENDED=suspend_histories.end_date
     */
    public record Restriction(
            String restrictionType,
            boolean recoverable,
            Instant availableAt,
            String messageCode,
            String reason,
            Instant startedAt,
            String duration
    ) {
        public static final String MESSAGE_CODE = "ACCOUNT_RESTRICTED";
    }
}
