package kr.co.carrer.admin.admin.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.admin.dto.AdminAclDTO;
import kr.co.carrer.admin.admin.dto.AdminManagementDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Management", description = "관리자 계정 및 IP ACL 관리 API")
public interface AdminManagementControllerDocs {

    @Operation(summary = "관리자 관리 KPI 요약 조회")
    ResponseEntity<ApiResponse<AdminManagementDTO.ResponseSummary>> getAdminSummary();

    @Operation(summary = "관리자 계정 목록 조회")
    ResponseEntity<ApiResponse<AdminManagementDTO.ResponseList>> getAdmins(
        @Parameter(description = "검색어") @RequestParam(required = false) String keyword,
        @Parameter(description = "관리자 권한") @RequestParam(required = false) String role,
        @Parameter(description = "관리자 상태") @RequestParam(required = false) String status,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "관리자 계정 생성")
    ResponseEntity<ApiResponse<AdminManagementDTO.ResponseAdmin>> createAdmin(
        @Valid @RequestBody AdminManagementDTO.RequestCreateAdmin request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "관리자 권한 변경")
    ResponseEntity<ApiResponse<AdminManagementDTO.ResponseAdmin>> updateAdminRole(
        @Parameter(description = "관리자 ID") @PathVariable Long adminId,
        @Valid @RequestBody AdminManagementDTO.RequestUpdateRole request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "관리자 상태 변경")
    ResponseEntity<ApiResponse<AdminManagementDTO.ResponseAdmin>> updateAdminStatus(
        @Parameter(description = "관리자 ID") @PathVariable Long adminId,
        @Valid @RequestBody AdminManagementDTO.RequestUpdateStatus request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "관리자 계정 삭제")
    ResponseEntity<ApiResponse<Void>> deleteAdmin(
        @Parameter(description = "관리자 ID") @PathVariable Long adminId,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "IP ACL 목록 조회")
    ResponseEntity<ApiResponse<AdminAclDTO.ResponseList>> getIpAcls(
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "IP ACL 등록")
    ResponseEntity<ApiResponse<AdminAclDTO.ResponseItem>> createIpAcl(
        @Valid @RequestBody AdminAclDTO.RequestCreate request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "IP ACL 활성 상태 변경")
    ResponseEntity<ApiResponse<AdminAclDTO.ResponseItem>> updateIpAclEnabled(
        @Parameter(description = "IP ACL ID") @PathVariable Long aclId,
        @Valid @RequestBody AdminAclDTO.RequestToggleEnabled request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "IP ACL 삭제")
    ResponseEntity<ApiResponse<Void>> deleteIpAcl(
        @Parameter(description = "IP ACL ID") @PathVariable Long aclId,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );
}
