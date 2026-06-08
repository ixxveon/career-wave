package kr.co.carrer.admin.member.dto;

import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SanctionType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import kr.co.carrer.admin.member.type.SuspendDuration;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

public class MemberDTO {

    public record ResponseList(
        UUID memberId,
        String loginId,
        String name,
        String email,
        RoleType role,
        SubscriptionStatus plan,
        MemberStatus memberStatus,
        int warningCount,
        long reportCount,
        ZonedDateTime joinedAt,
        ZonedDateTime lastLoginAt
    ) {}

    public record ResponseDetail(
        UUID memberId,
        String loginId,
        String name,
        String email,
        RoleType role,
        SubscriptionStatus plan,
        MemberStatus memberStatus,
        int warningCount,
        long reportCount,
        ZonedDateTime joinedAt,
        ZonedDateTime lastLoginAt
    ) {}

    public record RequestSanction(
        SanctionType sanctionType,
        SuspendDuration duration,
        String reason
    ) {}

    public record ResponseSanction(
        UUID memberId,
        MemberStatus memberStatus,
        SanctionType sanctionType,
        SuspendDuration duration,
        LocalDate startDate,
        LocalDate endDate
    ) {}
}
