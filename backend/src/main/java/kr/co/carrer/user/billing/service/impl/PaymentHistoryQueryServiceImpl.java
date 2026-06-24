package kr.co.carrer.user.billing.service.impl;

import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.entity.Plan;
import kr.co.carrer.user.billing.entity.UserPayment;
import kr.co.carrer.user.billing.repository.PlanRepository;
import kr.co.carrer.user.billing.repository.UserPaymentRepository;
import kr.co.carrer.user.billing.service.PaymentHistoryQueryService;
import kr.co.carrer.user.billing.type.UserPaymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentHistoryQueryServiceImpl implements PaymentHistoryQueryService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Set<UserPaymentStatus> HISTORY_STATUSES =
            Set.of(UserPaymentStatus.PAID, UserPaymentStatus.FAILED, UserPaymentStatus.REFUNDED);
    private static final Map<String, Integer> PERIOD_MONTHS =
            Map.of("1M", 1, "3M", 3, "6M", 6, "12M", 12);

    private final UserPaymentRepository userPaymentRepository;
    private final PlanRepository planRepository;

    @Override
    @Transactional(readOnly = true)
    public BillingDTO.ResponsePaymentHistory getPaymentHistory(UUID memberId, String period, int page, int size) {
        int months = PERIOD_MONTHS.getOrDefault(period, 1);
        ZonedDateTime from = ZonedDateTime.now(KST).minusMonths(months);

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<UserPayment> paymentPage = userPaymentRepository
                .findPaymentHistoryByMemberId(memberId, from, HISTORY_STATUSES, pageable);

        Set<String> productCodes = paymentPage.getContent().stream()
                .map(UserPayment::getProductCode)
                .collect(Collectors.toSet());
        Map<String, String> productNames = planRepository.findAllByProductCodeIn(productCodes)
                .stream()
                .collect(Collectors.toMap(Plan::getProductCode, Plan::getPlanName, (a, b) -> a));

        List<BillingDTO.PaymentHistoryItem> items = paymentPage.getContent().stream()
                .map(p -> toHistoryItem(p, productNames.get(p.getProductCode())))
                .toList();

        return new BillingDTO.ResponsePaymentHistory(
                items,
                paymentPage.getNumber(),
                paymentPage.getSize(),
                paymentPage.getTotalElements(),
                paymentPage.getTotalPages()
        );
    }

    private BillingDTO.PaymentHistoryItem toHistoryItem(UserPayment payment, String productName) {
        return new BillingDTO.PaymentHistoryItem(
                payment.getPaymentId(),
                payment.getOrderId(),
                payment.getProductCode(),
                productName,
                payment.getAmount(),
                payment.getCurrency(),
                payment.getPaymentStatus().name(),
                payment.getPaymentType().name(),
                payment.getAttemptSequence(),
                payment.getApprovedAt(),
                payment.getCreatedAt()
        );
    }
}
