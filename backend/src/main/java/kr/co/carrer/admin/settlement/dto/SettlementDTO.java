package kr.co.carrer.admin.settlement.dto;

import jakarta.validation.constraints.NotNull;
import kr.co.carrer.admin.settlement.type.SettlementItemType;
import kr.co.carrer.admin.settlement.type.SettlementStatus;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

public class SettlementDTO {

    public record RequestGenerate(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd
    ) {}

    public record RequestConfirm(
        String note
    ) {}

    public record ResponseList(
        Long settlementId,
        LocalDate periodStart,
        LocalDate periodEnd,
        long totalSalesAmount,
        long totalRefundAmount,
        long netSalesAmount,
        int totalTransactionCount,
        SettlementStatus settlementStatus,
        ZonedDateTime createdAt
    ) {}

    public record ResponseDetail(
        Long settlementId,
        LocalDate periodStart,
        LocalDate periodEnd,
        long totalSalesAmount,
        long totalRefundAmount,
        long netSalesAmount,
        long supplyAmount,
        long vatAmount,
        int totalTransactionCount,
        int paidCount,
        int refundCount,
        SettlementStatus settlementStatus,
        ZonedDateTime settledAt,
        String settledByName,
        String note,
        ZonedDateTime createdAt,
        List<ItemDetail> items
    ) {}

    public record ItemDetail(
        Long settlementItemId,
        String paymentId,
        String orderId,
        String memberName,
        String planName,
        int amount,
        SettlementItemType itemType,
        ZonedDateTime paymentApprovedAt
    ) {}

    public record ResponseConfirm(
        Long settlementId,
        SettlementStatus settlementStatus,
        ZonedDateTime settledAt
    ) {}
}
