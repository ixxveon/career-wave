package kr.co.carrer.user.billing.controller;

import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.docs.BillingProductControllerDocs;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.SubscriptionQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user/billing")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER')")
public class BillingProductController implements BillingProductControllerDocs {

    private final SubscriptionQueryService subscriptionQueryService;

    @Override
    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<BillingDTO.ProductItem>>> getProducts() {
        return ResponseEntity.ok(ApiResponse.ok(
                "상품 목록을 조회했습니다.",
                subscriptionQueryService.getProducts()
        ));
    }
}
