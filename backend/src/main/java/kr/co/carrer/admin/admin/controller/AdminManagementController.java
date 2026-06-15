package kr.co.carrer.admin.admin.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.admin.docs.AdminManagementDocs;
import kr.co.carrer.admin.admin.dto.AdminAclDTO;
import kr.co.carrer.admin.admin.dto.AdminManagementDTO;
import kr.co.carrer.admin.admin.service.AdminManagementService;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminManagementController implements AdminManagementDocs {

    private final AdminManagementService adminManagementService;

    @GetMapping("/admins/summary")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminManagementDTO.ResponseSummary>> getAdminSummary() {
        AdminManagementService.SummaryResult result = adminManagementService.getAdminSummary();

        AdminManagementDTO.ResponseSummary response = new AdminManagementDTO.ResponseSummary(
            result.totalAdminCount(),
            result.activeAdminCount(),
            result.lockedAdminCount(),
            result.masterAdminCount()
        );

        return ResponseEntity.ok(ApiResponse.ok("관리자 관리 KPI 요약 조회에 성공했습니다.", response));
    }

    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminManagementDTO.ResponseList>> getAdmins(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String role,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        AdminRole adminRole = parseEnum(AdminRole.class, role);
        AdminStatus adminStatus = parseEnum(AdminStatus.class, status);

        PaginationResponse<AdminManagementService.AdminListItem> result =
            adminManagementService.getAdmins(keyword, adminRole, adminStatus, page, size);

        List<AdminManagementDTO.ResponseAdmin> content = result.items().stream()
            .map(item -> new AdminManagementDTO.ResponseAdmin(
                item.adminId(),
                item.email(),
                item.name(),
                item.adminRole(),
                item.status(),
                item.lastLoginAt(),
                item.lastLoginIp(),
                item.createdAt(),
                item.updatedAt()
            ))
            .toList();

        AdminManagementDTO.ResponseList response = new AdminManagementDTO.ResponseList(
            content,
            result.page(),
            result.size(),
            result.totalItems(),
            result.totalPages()
        );

        return ResponseEntity.ok(ApiResponse.ok("관리자 계정 목록 조회에 성공했습니다.", response));
    }

    @PostMapping("/admins")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminManagementDTO.ResponseAdmin>> createAdmin(
        @Valid @RequestBody AdminManagementDTO.RequestCreateAdmin request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        AdminManagementService.AdminDetailResult result = adminManagementService.createAdmin(
            new AdminManagementService.CreateAdminCommand(
                request.email(),
                request.password(),
                request.name(),
                request.adminRole()
            ),
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        AdminManagementDTO.ResponseAdmin response = new AdminManagementDTO.ResponseAdmin(
            result.adminId(),
            result.email(),
            result.name(),
            result.adminRole(),
            result.status(),
            result.lastLoginAt(),
            result.lastLoginIp(),
            result.createdAt(),
            result.updatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("관리자 계정 생성에 성공했습니다.", response));
    }

    @PatchMapping("/admins/{adminId}/role")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminManagementDTO.ResponseAdmin>> updateAdminRole(
        @PathVariable Long adminId,
        @Valid @RequestBody AdminManagementDTO.RequestUpdateRole request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        AdminManagementService.AdminDetailResult result = adminManagementService.updateAdminRole(
            adminId,
            new AdminManagementService.UpdateAdminRoleCommand(request.adminRole()),
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        AdminManagementDTO.ResponseAdmin response = new AdminManagementDTO.ResponseAdmin(
            result.adminId(),
            result.email(),
            result.name(),
            result.adminRole(),
            result.status(),
            result.lastLoginAt(),
            result.lastLoginIp(),
            result.createdAt(),
            result.updatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("관리자 권한 변경에 성공했습니다.", response));
    }

    @PatchMapping("/admins/{adminId}/status")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminManagementDTO.ResponseAdmin>> updateAdminStatus(
        @PathVariable Long adminId,
        @Valid @RequestBody AdminManagementDTO.RequestUpdateStatus request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        AdminManagementService.AdminDetailResult result = adminManagementService.updateAdminStatus(
            adminId,
            new AdminManagementService.UpdateAdminStatusCommand(request.status()),
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        AdminManagementDTO.ResponseAdmin response = new AdminManagementDTO.ResponseAdmin(
            result.adminId(),
            result.email(),
            result.name(),
            result.adminRole(),
            result.status(),
            result.lastLoginAt(),
            result.lastLoginIp(),
            result.createdAt(),
            result.updatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("관리자 상태 변경에 성공했습니다.", response));
    }

    @DeleteMapping("/admins/{adminId}")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<Void>> deleteAdmin(
        @PathVariable Long adminId,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        adminManagementService.deleteAdmin(
            adminId,
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        return ResponseEntity.ok(ApiResponse.ok("관리자 계정 삭제에 성공했습니다."));
    }

    @GetMapping("/admin-acls")
    @PreAuthorize("hasRole('ADMIN') and (principal.adminRole == 'MASTER' or principal.adminRole == 'BACKEND')")
    public ResponseEntity<ApiResponse<AdminAclDTO.ResponseList>> getIpAcls(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        PaginationResponse<AdminManagementService.IpAclListItem> result =
            adminManagementService.getIpAcls(page, size);

        List<AdminAclDTO.ResponseItem> content = result.items().stream()
            .map(item -> new AdminAclDTO.ResponseItem(
                item.ipAclId(),
                item.label(),
                item.ipRange(),
                item.isEnabled(),
                item.description(),
                item.createdAt(),
                item.updatedAt()
            ))
            .toList();

        AdminAclDTO.ResponseList response = new AdminAclDTO.ResponseList(
            content,
            result.page(),
            result.size(),
            result.totalItems(),
            result.totalPages()
        );

        return ResponseEntity.ok(ApiResponse.ok("IP ACL 목록 조회에 성공했습니다.", response));
    }

    @PostMapping("/admin-acls")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminAclDTO.ResponseItem>> createIpAcl(
        @Valid @RequestBody AdminAclDTO.RequestCreate request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        AdminManagementService.IpAclDetailResult result = adminManagementService.createIpAcl(
            new AdminManagementService.CreateIpAclCommand(
                request.label(),
                request.ipRange(),
                request.description()
            ),
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        AdminAclDTO.ResponseItem response = new AdminAclDTO.ResponseItem(
            result.ipAclId(),
            result.label(),
            result.ipRange(),
            result.isEnabled(),
            result.description(),
            result.createdAt(),
            result.updatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("IP ACL 등록에 성공했습니다.", response));
    }

    @PatchMapping("/admin-acls/{aclId}/enabled")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<AdminAclDTO.ResponseItem>> updateIpAclEnabled(
        @PathVariable Long aclId,
        @Valid @RequestBody AdminAclDTO.RequestToggleEnabled request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        AdminManagementService.IpAclDetailResult result = adminManagementService.updateIpAclEnabled(
            aclId,
            new AdminManagementService.UpdateIpAclEnabledCommand(request.isEnabled()),
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        AdminAclDTO.ResponseItem response = new AdminAclDTO.ResponseItem(
            result.ipAclId(),
            result.label(),
            result.ipRange(),
            result.isEnabled(),
            result.description(),
            result.createdAt(),
            result.updatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("IP ACL 활성 상태 변경에 성공했습니다.", response));
    }

    @DeleteMapping("/admin-acls/{aclId}")
    @PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
    public ResponseEntity<ApiResponse<Void>> deleteIpAcl(
        @PathVariable Long aclId,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        adminManagementService.deleteIpAcl(
            aclId,
            extractAdminId(principal),
            extractClientIp(httpServletRequest)
        );

        return ResponseEntity.ok(ApiResponse.ok("IP ACL 삭제에 성공했습니다."));
    }

    private Long extractAdminId(AuthPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getId().isBlank()) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.valueOf(principal.getId());
        } catch (NumberFormatException exception) {
            throw new CustomException(ErrorCode.UNAUTHORIZED);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }
}
