package kr.co.carrer.admin.admin.service;

import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import kr.co.carrer.global.response.PaginationResponse;

import java.time.ZonedDateTime;

public interface AdminManagementService {

    SummaryResult getAdminSummary();

    PaginationResponse<AdminListItem> getAdmins(String keyword, AdminRole role, AdminStatus status, int page, int size);

    AdminDetailResult createAdmin(CreateAdminCommand command, Long actorAdminId, String ipAddress);

    AdminDetailResult updateAdminRole(Long adminId, UpdateAdminRoleCommand command, Long actorAdminId, String ipAddress);

    AdminDetailResult updateAdminStatus(Long adminId, UpdateAdminStatusCommand command, Long actorAdminId, String ipAddress);

    void deleteAdmin(Long adminId, Long actorAdminId, String ipAddress);

    PaginationResponse<IpAclListItem> getIpAcls(int page, int size);

    IpAclDetailResult createIpAcl(CreateIpAclCommand command, Long actorAdminId, String ipAddress);

    IpAclDetailResult updateIpAclEnabled(Long aclId, UpdateIpAclEnabledCommand command, Long actorAdminId, String ipAddress);

    void deleteIpAcl(Long aclId, Long actorAdminId, String ipAddress);

    record SummaryResult(
            long totalAdminCount,
            long activeAdminCount,
            long lockedAdminCount,
            long masterAdminCount
    ) {
    }

    record AdminListItem(
            Long adminId,
            String email,
            String name,
            AdminRole adminRole,
            AdminStatus status,
            ZonedDateTime lastLoginAt,
            String lastLoginIp,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }

    record CreateAdminCommand(
            String email,
            String password,
            String name,
            AdminRole adminRole
    ) {
    }

    record AdminDetailResult(
            Long adminId,
            String email,
            String name,
            AdminRole adminRole,
            AdminStatus status,
            ZonedDateTime lastLoginAt,
            String lastLoginIp,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }

    record UpdateAdminRoleCommand(
            AdminRole adminRole
    ) {
    }

    record UpdateAdminStatusCommand(
            AdminStatus status
    ) {
    }

    record IpAclListItem(
            Long ipAclId,
            String label,
            String ipRange,
            Boolean isEnabled,
            String description,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }

    record CreateIpAclCommand(
            String label,
            String ipRange,
            String description
    ) {
    }

    record IpAclDetailResult(
            Long ipAclId,
            String label,
            String ipRange,
            Boolean isEnabled,
            String description,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
    }

    record UpdateIpAclEnabledCommand(
            Boolean isEnabled
    ) {
    }
}
