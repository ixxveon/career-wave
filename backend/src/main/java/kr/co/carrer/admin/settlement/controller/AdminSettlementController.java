package kr.co.carrer.admin.settlement.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.settlement.docs.AdminSettlementControllerDocs;
import kr.co.carrer.admin.settlement.dto.SettlementDTO;
import kr.co.carrer.admin.settlement.service.AdminSettlementService;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/settlements")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN') and principal.adminRole == 'MASTER'")
public class AdminSettlementController implements AdminSettlementControllerDocs {

    private final AdminSettlementService adminSettlementService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<SettlementDTO.ResponseList>>> getSettlements(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        SettlementStatus settlementStatus = parseEnum(SettlementStatus.class, status);
        return ResponseEntity.ok(ApiResponse.ok(
            adminSettlementService.getSettlements(settlementStatus, page, size)
        ));
    }

    @GetMapping("/{settlementId}")
    public ResponseEntity<ApiResponse<SettlementDTO.ResponseDetail>> getSettlementDetail(
        @PathVariable Long settlementId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminSettlementService.getSettlementDetail(settlementId)));
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<SettlementDTO.ResponseList>> generateSettlement(
        @Valid @RequestBody SettlementDTO.RequestGenerate request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        Long adminId = resolveAdminId(principal);
        String ipAddress = extractClientIp(httpServletRequest);
        return ResponseEntity.ok(ApiResponse.ok(
            adminSettlementService.generateSettlement(request, adminId, ipAddress)
        ));
    }

    @PatchMapping("/{settlementId}/confirm")
    public ResponseEntity<ApiResponse<SettlementDTO.ResponseConfirm>> confirmSettlement(
        @PathVariable Long settlementId,
        @Valid @RequestBody SettlementDTO.RequestConfirm request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    ) {
        Long adminId = resolveAdminId(principal);
        String ipAddress = extractClientIp(httpServletRequest);
        return ResponseEntity.ok(ApiResponse.ok(
            adminSettlementService.confirmSettlement(settlementId, request, adminId, ipAddress)
        ));
    }

    private Long resolveAdminId(AuthPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
        try {
            return Long.parseLong(principal.getId());
        } catch (NumberFormatException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }
}
