package kr.co.carrer.user.billing.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.EntitlementDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@Tag(name = "Entitlement", description = "상품별 이용권 조회 API")
public interface EntitlementControllerDocs {

    @Operation(
            summary = "내 이용권 목록 조회",
            description = "로그인된 USER 회원의 전체 상품 이용권 목록을 조회합니다. " +
                    "serviceAvailable=true 이면 서비스 이용 가능, false 이면 unavailableReason 참조."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공")
    })
    ResponseEntity<ApiResponse<EntitlementDTO.ResponseEntitlementList>> getMyEntitlements(
            @AuthenticationPrincipal AuthPrincipal principal
    );
}
