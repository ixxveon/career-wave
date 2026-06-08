package kr.co.carrer.admin.member.dto;

import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.PermissionLevel;

import java.time.ZonedDateTime;
import java.util.UUID;

public class HrManagerDTO {

    public record ResponseList(
        UUID memberId,
        String hrName,
        String email,
        String companyName,
        String certificateNumber,
        PermissionLevel permissionLevel,
        String certFileUrl,
        String certFileName,
        ZonedDateTime joinedAt,
        ZonedDateTime approvedAt,
        HrStatus hrStatus
    ) {}

    public record ResponseDetail(
        UUID memberId,
        String hrName,
        String email,
        String companyName,
        String certificateNumber,
        PermissionLevel permissionLevel,
        String certFileUrl,
        String certFileName,
        ZonedDateTime joinedAt,
        ZonedDateTime approvedAt,
        HrStatus hrStatus,
        String rejectReason
    ) {}

    public record RequestReject(
        String rejectReason
    ) {}

    public record ResponseApprove(
        UUID memberId,
        HrStatus hrStatus,
        ZonedDateTime approvedAt
    ) {}

    public record ResponseReject(
        UUID memberId,
        HrStatus hrStatus,
        String rejectReason
    ) {}
}
