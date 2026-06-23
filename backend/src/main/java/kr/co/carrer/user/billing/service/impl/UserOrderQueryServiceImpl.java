package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.UserOrderQueryService;
import kr.co.carrer.user.billing.type.PaymentFailureReason;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserOrderQueryServiceImpl implements UserOrderQueryService {

    // AUTHORIZED·RECONCILING 은 FE에 노출하지 않음 — CONFIRMING 으로 표시
    private static final Map<UserPaymentStatus, String> FE_STATUS_MAP = Map.of(
            UserPaymentStatus.READY, "READY",
            UserPaymentStatus.AUTHORIZED, "CONFIRMING",
            UserPaymentStatus.CONFIRMING, "CONFIRMING",
            UserPaymentStatus.RECONCILING, "CONFIRMING",
            UserPaymentStatus.PAID, "PAID",
            UserPaymentStatus.FAILED, "FAILED",
            UserPaymentStatus.CANCELED, "CANCELED",
            UserPaymentStatus.REFUNDED, "REFUNDED"
    );

    private final UserPaymentRepository userPaymentRepository;
    private final PlanRepository planRepository;

    @Override
    @Transactional(readOnly = true)
    public BillingDTO.PaymentStatusResponse getOrderStatus(UUID memberId, String orderId) {
        UserPayment payment = userPaymentRepository
                .findByOrderIdAndMemberId(orderId, memberId)
                .orElseThrow(() -> new CustomException(BillingErrorCode.BILLING_ORDER_NOT_FOUND));

        String productName = planRepository
                .findByProductCodeAndIsActive(payment.getProductCode(), true)
                .map(plan -> plan.getPlanName())
                .orElse(null);

        BillingDTO.PaymentFailureDetail failure = null;
        if (payment.getPaymentStatus() == UserPaymentStatus.FAILED
                && payment.getFailureReason() != null) {
            failure = new BillingDTO.PaymentFailureDetail(
                    payment.getFailureReason().name(),
                    toDisplayMessage(payment.getFailureReason()),
                    isRetryable(payment.getFailureReason())
            );
        }

        return new BillingDTO.PaymentStatusResponse(
                payment.getOrderId(),
                FE_STATUS_MAP.getOrDefault(payment.getPaymentStatus(), "FAILED"),
                payment.getProductCode(),
                productName,
                payment.getAmount(),
                payment.getApprovedAt(),
                failure
        );
    }

    private boolean isRetryable(PaymentFailureReason reason) {
        return switch (reason) {
            case USER_CANCELED, CARD_DECLINED, TIMEOUT -> true;
            default -> false;
        };
    }

    private String toDisplayMessage(PaymentFailureReason reason) {
        return switch (reason) {
            case USER_CANCELED -> "결제를 취소하셨습니다.";
            case CARD_DECLINED -> "카드 승인이 거절되었습니다.";
            case TIMEOUT -> "결제 요청 시간이 초과되었습니다.";
            case DUPLICATE_ORDER -> "이미 처리된 주문입니다.";
            case CONFIRM_FAILED -> "결제 승인에 실패했습니다.";
            case FORBIDDEN -> "결제가 제한된 계정입니다.";
            default -> "알 수 없는 오류가 발생했습니다.";
        };
    }
}
