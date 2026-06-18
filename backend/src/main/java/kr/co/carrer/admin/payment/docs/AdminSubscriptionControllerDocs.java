package kr.co.carrer.admin.payment.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.admin.payment.dto.SubscriptionDTO;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Subscription", description = "관리자 구독 현황 API")
public interface AdminSubscriptionControllerDocs {

    @Operation(summary = "구독 현황 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<SubscriptionDTO.ResponseList>>> getSubscriptions(
        @Parameter(description = "구독 상태 (ACTIVE / CANCEL_SCHEDULED / EXPIRED / PAYMENT_FAILED / REFUND_PENDING / REFUNDED)") @RequestParam(required = false) String status,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") int size
    );
}
