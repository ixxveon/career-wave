package kr.co.carrer.admin.settlement.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.settlement.exception.AdminSettlementErrorCode;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import kr.co.carrer.global.exception.CustomException;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Table(
    name = "settlement_reports",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_settlement_period",
            columnNames = {"settlement_period_start", "settlement_period_end"})
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementReport {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settlement_id")
    private Long settlementId;

    @Column(name = "settlement_period_start", nullable = false)
    private LocalDate settlementPeriodStart;

    @Column(name = "settlement_period_end", nullable = false)
    private LocalDate settlementPeriodEnd;

    @Column(name = "total_sales_amount", nullable = false)
    private long totalSalesAmount;

    @Column(name = "total_refund_amount", nullable = false)
    private long totalRefundAmount;

    @Column(name = "net_sales_amount", nullable = false)
    private long netSalesAmount;

    @Column(name = "supply_amount", nullable = false)
    private long supplyAmount;

    @Column(name = "vat_amount", nullable = false)
    private long vatAmount;

    @Column(name = "total_transaction_count", nullable = false)
    private int totalTransactionCount;

    @Column(name = "paid_count", nullable = false)
    private int paidCount;

    @Column(name = "refund_count", nullable = false)
    private int refundCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", nullable = false, length = 20)
    private SettlementStatus settlementStatus;

    @Column(name = "settled_at")
    private ZonedDateTime settledAt;

    @Column(name = "admin_id")
    private Long adminId;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(KST);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(KST);
    }

    public static SettlementReport create(LocalDate periodStart, LocalDate periodEnd,
                                          long totalSalesAmount, long totalRefundAmount,
                                          int paidCount, int refundCount) {
        SettlementReport report = new SettlementReport();
        report.settlementPeriodStart = periodStart;
        report.settlementPeriodEnd = periodEnd;
        report.totalSalesAmount = totalSalesAmount;
        report.totalRefundAmount = totalRefundAmount;
        report.netSalesAmount = totalSalesAmount - totalRefundAmount;
        report.supplyAmount = report.netSalesAmount * 10 / 11;
        report.vatAmount = report.netSalesAmount - report.supplyAmount;
        report.totalTransactionCount = paidCount + refundCount;
        report.paidCount = paidCount;
        report.refundCount = refundCount;
        report.settlementStatus = SettlementStatus.PENDING;
        return report;
    }

    public void confirm(Long adminId, String note) {
        if (this.settlementStatus != SettlementStatus.PENDING) {
            throw new CustomException(AdminSettlementErrorCode.ALREADY_CONFIRMED);
        }
        this.settlementStatus = SettlementStatus.CONFIRMED;
        this.adminId = adminId;
        this.settledAt = ZonedDateTime.now(KST);
        this.note = note;
    }
}
