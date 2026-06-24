package kr.co.carrer.user.billing.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import org.springframework.http.ResponseEntity;

import java.util.List;

@Tag(name = "User Billing Products", description = "사용자 구독 상품 조회 API")
public interface BillingProductControllerDocs {

    @Operation(summary = "구독 상품 목록 조회")
    ResponseEntity<ApiResponse<List<BillingDTO.ProductItem>>> getProducts();
}
