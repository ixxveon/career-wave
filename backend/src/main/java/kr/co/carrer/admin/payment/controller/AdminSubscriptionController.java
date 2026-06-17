package kr.co.carrer.admin.payment.controller;

import kr.co.carrer.admin.payment.docs.AdminSubscriptionControllerDocs;
import kr.co.carrer.admin.payment.dto.SubscriptionDTO;
import kr.co.carrer.admin.payment.service.AdminSubscriptionService;
import kr.co.carrer.admin.payment.type.SubscriptionStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/subscriptions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSubscriptionController implements AdminSubscriptionControllerDocs {

    private final AdminSubscriptionService adminSubscriptionService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<SubscriptionDTO.ResponseList>>> getSubscriptions(
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        SubscriptionStatus subscriptionStatus = parseEnum(SubscriptionStatus.class, status);
        return ResponseEntity.ok(ApiResponse.ok(
            adminSubscriptionService.getSubscriptions(subscriptionStatus, page, size)
        ));
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
