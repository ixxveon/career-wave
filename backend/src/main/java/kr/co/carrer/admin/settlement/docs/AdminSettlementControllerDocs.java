package kr.co.carrer.admin.settlement.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.settlement.dto.SettlementDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Settlement", description = "관리자 정산 리포트 관리 API")
public interface AdminSettlementControllerDocs {

    @Operation(summary = "정산 리포트 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<SettlementDTO.ResponseList>>> getSettlements(
        @Parameter(description = "정산 상태 필터 (PENDING / CONFIRMED)") @RequestParam(required = false) String status,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "정산 리포트 상세 조회")
    ResponseEntity<ApiResponse<SettlementDTO.ResponseDetail>> getSettlementDetail(
        @Parameter(description = "정산 리포트 ID") @PathVariable Long settlementId
    );

    @Operation(summary = "정산 리포트 수동 생성")
    ResponseEntity<ApiResponse<SettlementDTO.ResponseList>> generateSettlement(
        @Valid @RequestBody SettlementDTO.RequestGenerate request,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
        @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );

    @Operation(summary = "정산 확정")
    ResponseEntity<ApiResponse<SettlementDTO.ResponseConfirm>> confirmSettlement(
        @Parameter(description = "정산 리포트 ID") @PathVariable Long settlementId,
        @Valid @RequestBody SettlementDTO.RequestConfirm request,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
        @Parameter(hidden = true) HttpServletRequest httpServletRequest
    );
}
