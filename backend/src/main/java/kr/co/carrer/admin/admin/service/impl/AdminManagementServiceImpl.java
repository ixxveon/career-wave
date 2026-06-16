package kr.co.carrer.admin.admin.service.impl;

import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.entity.IpAcl;
import kr.co.carrer.admin.admin.exception.AdminManagementErrorCode;
import kr.co.carrer.admin.admin.repository.AdminQueryRepository;
import kr.co.carrer.admin.admin.repository.AdminRepository;
import kr.co.carrer.admin.admin.repository.IpAclRepository;
import kr.co.carrer.admin.admin.repository.IpAclQueryRepository;
import kr.co.carrer.admin.admin.service.AdminAuditActionExecutor;
import kr.co.carrer.admin.admin.service.AdminManagementService;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminManagementServiceImpl implements AdminManagementService {

    private final AdminRepository adminRepository;
    private final AdminQueryRepository adminQueryRepository;
    private final IpAclRepository ipAclRepository;
    private final IpAclQueryRepository ipAclQueryRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditActionExecutor adminAuditActionExecutor;

    private static final String TARGET_TYPE_ADMIN = "ADMIN";
    private static final String TARGET_TYPE_IP_ACL = "IP_ACL";

    @Override
    @Transactional(readOnly = true)
    public SummaryResult getAdminSummary() {
        long totalAdminCount = adminRepository.count();
        long activeAdminCount = adminRepository.countByStatus(AdminStatus.ACTIVE);
        long lockedAdminCount = adminRepository.countByStatus(AdminStatus.LOCKED);
        long masterAdminCount = adminRepository.countByAdminRole(AdminRole.MASTER);

        return new SummaryResult(
                totalAdminCount,
                activeAdminCount,
                lockedAdminCount,
                masterAdminCount
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<AdminListItem> getAdmins(String keyword, AdminRole role, AdminStatus status, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Page<Admin> adminPage = adminQueryRepository.findAdmins(
                keyword,
                role,
                status,
                PageRequest.of(safePage - 1, safeSize)
        );

        List<AdminListItem> items = adminPage.getContent().stream()
                .map(this::toAdminListItem)
                .toList();

        return PaginationResponse.of(items, safePage, safeSize, adminPage.getTotalElements());
    }

    @Override
    @Transactional
    public AdminDetailResult createAdmin(CreateAdminCommand command, Long actorAdminId, String ipAddress) {
        return adminAuditActionExecutor.execute(actorAdminId, "CREATE_ADMIN", TARGET_TYPE_ADMIN, ipAddress, 0L, () -> {
            if (command.adminRole() == null) {
                throw new CustomException(AdminManagementErrorCode.INVALID_ADMIN_ROLE);
            }

            if (adminRepository.existsByEmail(command.email())) {
                throw new CustomException(AdminManagementErrorCode.ADMIN_EMAIL_ALREADY_EXISTS);
            }

            Admin admin = Admin.create(
                    command.email(),
                    passwordEncoder.encode(command.password()),
                    command.name(),
                    command.adminRole()
            );

            Admin savedAdmin;
            try {
                savedAdmin = adminRepository.saveAndFlush(admin);
            } catch (DataIntegrityViolationException exception) {
                if (isUniqueConstraintViolation(exception, "admins_email_key")) {
                    throw new CustomException(AdminManagementErrorCode.ADMIN_EMAIL_ALREADY_EXISTS);
                }
                throw exception;
            }
            return toAdminDetailResult(savedAdmin);
        }, AdminDetailResult::adminId);
    }

    @Override
    @Transactional
    public AdminDetailResult updateAdminRole(Long adminId, UpdateAdminRoleCommand command, Long actorAdminId, String ipAddress) {
        return adminAuditActionExecutor.execute(actorAdminId, "UPDATE_ADMIN_ROLE", TARGET_TYPE_ADMIN, adminId, ipAddress, () -> {
            if (command.adminRole() == null) {
                throw new CustomException(AdminManagementErrorCode.INVALID_ADMIN_ROLE);
            }

            Admin admin = adminRepository.findById(adminId)
                    .orElseThrow(() -> new CustomException(AdminManagementErrorCode.ADMIN_NOT_FOUND));

            admin.updateRole(command.adminRole());
            return toAdminDetailResult(admin);
        });
    }

    @Override
    @Transactional
    public AdminDetailResult updateAdminStatus(Long adminId, UpdateAdminStatusCommand command, Long actorAdminId, String ipAddress) {
        return adminAuditActionExecutor.execute(actorAdminId, "UPDATE_ADMIN_STATUS", TARGET_TYPE_ADMIN, adminId, ipAddress, () -> {
            if (command.status() == null) {
                throw new CustomException(AdminManagementErrorCode.INVALID_ADMIN_STATUS);
            }

            Admin admin = adminRepository.findById(adminId)
                    .orElseThrow(() -> new CustomException(AdminManagementErrorCode.ADMIN_NOT_FOUND));

            if (admin.getStatus() == command.status()) {
                if (command.status() == AdminStatus.LOCKED) {
                    throw new CustomException(AdminManagementErrorCode.ADMIN_ALREADY_LOCKED);
                }
                throw new CustomException(AdminManagementErrorCode.ADMIN_ALREADY_ACTIVE);
            }

            admin.updateStatus(command.status());
            return toAdminDetailResult(admin);
        });
    }

    @Override
    @Transactional
    public void deleteAdmin(Long adminId, Long actorAdminId, String ipAddress) {
        adminAuditActionExecutor.execute(actorAdminId, "DELETE_ADMIN", TARGET_TYPE_ADMIN, adminId, ipAddress, () -> {
            if (adminId.equals(actorAdminId)) {
                throw new CustomException(AdminManagementErrorCode.CANNOT_DELETE_SELF);
            }

            Admin admin = adminRepository.findById(adminId)
                    .orElseThrow(() -> new CustomException(AdminManagementErrorCode.ADMIN_NOT_FOUND));

            adminRepository.delete(admin);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<IpAclListItem> getIpAcls(int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Page<IpAcl> ipAclPage = ipAclQueryRepository.findIpAcls(PageRequest.of(safePage - 1, safeSize));
        List<IpAclListItem> items = ipAclPage.getContent().stream()
                .map(this::toIpAclListItem)
                .toList();

        return PaginationResponse.of(items, safePage, safeSize, ipAclPage.getTotalElements());
    }

    @Override
    @Transactional
    public IpAclDetailResult createIpAcl(CreateIpAclCommand command, Long actorAdminId, String ipAddress) {
        return adminAuditActionExecutor.execute(actorAdminId, "CREATE_IP_ACL", TARGET_TYPE_IP_ACL, ipAddress, 0L, () -> {
            if (ipAclRepository.existsByIpRange(command.ipRange())) {
                throw new CustomException(AdminManagementErrorCode.IP_ACL_DUPLICATED_RANGE);
            }

            IpAcl ipAcl = IpAcl.create(
                    command.label(),
                    command.ipRange(),
                    command.description()
            );

            IpAcl savedIpAcl;
            try {
                savedIpAcl = ipAclRepository.saveAndFlush(ipAcl);
            } catch (DataIntegrityViolationException exception) {
                if (isUniqueConstraintViolation(exception, "ip_acl_ip_range_key")) {
                    throw new CustomException(AdminManagementErrorCode.IP_ACL_DUPLICATED_RANGE);
                }
                throw exception;
            }
            return toIpAclDetailResult(savedIpAcl);
        }, IpAclDetailResult::ipAclId);
    }

    @Override
    @Transactional
    public IpAclDetailResult updateIpAclEnabled(Long aclId, UpdateIpAclEnabledCommand command, Long actorAdminId, String ipAddress) {
        return adminAuditActionExecutor.execute(actorAdminId, "UPDATE_IP_ACL_ENABLED", TARGET_TYPE_IP_ACL, aclId, ipAddress, () -> {
            if (command.isEnabled() == null) {
                throw new CustomException(ErrorCode.BAD_REQUEST);
            }

            IpAcl ipAcl = ipAclRepository.findById(aclId)
                    .orElseThrow(() -> new CustomException(AdminManagementErrorCode.IP_ACL_NOT_FOUND));

            if (ipAcl.getIsEnabled().equals(command.isEnabled())) {
                if (Boolean.TRUE.equals(command.isEnabled())) {
                    throw new CustomException(AdminManagementErrorCode.IP_ACL_ALREADY_ENABLED);
                }
                throw new CustomException(AdminManagementErrorCode.IP_ACL_ALREADY_DISABLED);
            }

            ipAcl.updateEnabled(command.isEnabled());
            return toIpAclDetailResult(ipAcl);
        });
    }

    @Override
    @Transactional
    public void deleteIpAcl(Long aclId, Long actorAdminId, String ipAddress) {
        adminAuditActionExecutor.execute(actorAdminId, "DELETE_IP_ACL", TARGET_TYPE_IP_ACL, aclId, ipAddress, () -> {
            IpAcl ipAcl = ipAclRepository.findById(aclId)
                    .orElseThrow(() -> new CustomException(AdminManagementErrorCode.IP_ACL_NOT_FOUND));

            ipAclRepository.delete(ipAcl);
        });
    }

    private boolean isUniqueConstraintViolation(Throwable throwable, String constraintName) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SQLException sqlException) {
                if ("23505".equals(sqlException.getSQLState())) {
                    if (constraintName == null || sqlException.getMessage() == null || sqlException.getMessage().contains(constraintName)) {
                        return true;
                    }
                }
            }
            if (current.getMessage() != null && current.getMessage().contains(constraintName)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private AdminListItem toAdminListItem(Admin admin) {
        return new AdminListItem(
                admin.getAdminId(),
                admin.getEmail(),
                admin.getName(),
                admin.getAdminRole(),
                admin.getStatus(),
                admin.getLastLoginAt(),
                admin.getLastLoginIp(),
                admin.getCreatedAt(),
                admin.getUpdatedAt()
        );
    }

    private IpAclListItem toIpAclListItem(IpAcl ipAcl) {
        return new IpAclListItem(
                ipAcl.getIpAclId(),
                ipAcl.getLabel(),
                ipAcl.getIpRange(),
                ipAcl.getIsEnabled(),
                ipAcl.getDescription(),
                ipAcl.getCreatedAt(),
                ipAcl.getUpdatedAt()
        );
    }

    private IpAclDetailResult toIpAclDetailResult(IpAcl ipAcl) {
        return new IpAclDetailResult(
                ipAcl.getIpAclId(),
                ipAcl.getLabel(),
                ipAcl.getIpRange(),
                ipAcl.getIsEnabled(),
                ipAcl.getDescription(),
                ipAcl.getCreatedAt(),
                ipAcl.getUpdatedAt()
        );
    }

    private AdminDetailResult toAdminDetailResult(Admin admin) {
        return new AdminDetailResult(
                admin.getAdminId(),
                admin.getEmail(),
                admin.getName(),
                admin.getAdminRole(),
                admin.getStatus(),
                admin.getLastLoginAt(),
                admin.getLastLoginIp(),
                admin.getCreatedAt(),
                admin.getUpdatedAt()
        );
    }
}
