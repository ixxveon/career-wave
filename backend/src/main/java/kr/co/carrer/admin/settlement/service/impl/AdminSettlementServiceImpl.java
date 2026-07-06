package kr.co.carrer.admin.settlement.service.impl;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.audit.entity.AuditLog;
import kr.co.carrer.admin.audit.repository.AuditLogRepository;
import kr.co.carrer.admin.audit.type.AuditLogSeverity;
import kr.co.carrer.admin.audit.type.AuditLogType;
import kr.co.carrer.admin.settlement.dto.SettlementDTO;
import kr.co.carrer.admin.settlement.entity.SettlementItem;
import kr.co.carrer.admin.settlement.entity.SettlementReport;
import kr.co.carrer.admin.settlement.exception.AdminSettlementErrorCode;
import kr.co.carrer.admin.settlement.repository.SettlementItemRepository;
import kr.co.carrer.admin.settlement.repository.SettlementReportQueryRepository;
import kr.co.carrer.admin.settlement.repository.SettlementReportRepository;
import kr.co.carrer.admin.settlement.service.AdminSettlementService;
import kr.co.carrer.admin.settlement.type.SettlementItemType;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminSettlementServiceImpl implements AdminSettlementService {

    private final SettlementReportRepository settlementReportRepository;
    private final SettlementReportQueryRepository settlementReportQueryRepository;
    private final SettlementItemRepository settlementItemRepository;
    private final AuditLogRepository auditLogRepository;

    @PersistenceContext
    private EntityManager em;

    private static final String TARGET_TYPE = "SETTLEMENT_REPORT";

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<SettlementDTO.ResponseList> getSettlements(SettlementStatus status, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int offset = (int) Math.min((long) (safePage - 1) * safeSize, Integer.MAX_VALUE);

        List<SettlementDTO.ResponseList> items = settlementReportQueryRepository.findSettlements(status, offset, safeSize);
        long total = settlementReportQueryRepository.countSettlements(status);
        return PaginationResponse.of(items, safePage, safeSize, total);
    }

    @Override
    @Transactional(readOnly = true)
    public SettlementDTO.ResponseDetail getSettlementDetail(Long settlementId) {
        return settlementReportQueryRepository.findSettlementDetail(settlementId)
            .orElseThrow(() -> new CustomException(AdminSettlementErrorCode.SETTLEMENT_NOT_FOUND));
    }

    @Override
    @Transactional
    public SettlementDTO.ResponseList generateSettlement(SettlementDTO.RequestGenerate request,
                                                         Long adminId, String ipAddress) {
        LocalDate periodStart = request.periodStart();
        LocalDate periodEnd = request.periodEnd();

        if (!periodStart.isBefore(periodEnd)) {
            throw new CustomException(AdminSettlementErrorCode.INVALID_PERIOD);
        }

        Optional<SettlementReport> existing = settlementReportRepository
            .findBySettlementPeriodStartAndSettlementPeriodEnd(periodStart, periodEnd);

        if (existing.isPresent()) {
            SettlementReport existingReport = existing.get();
            if (existingReport.getSettlementStatus() == SettlementStatus.CONFIRMED) {
                throw new CustomException(AdminSettlementErrorCode.DUPLICATE_PERIOD);
            }
            saveAuditLog(adminId, "REGENERATE_SETTLEMENT_DELETE_PENDING", existingReport.getSettlementId(), ipAddress);
            settlementItemRepository.deleteBySettlementId(existingReport.getSettlementId());
            settlementReportRepository.delete(existingReport);
            settlementReportRepository.flush();
        }

        AggregateResult aggregate = aggregatePaymentsAndRefunds(periodStart, periodEnd);

        SettlementReport report = SettlementReport.create(
            periodStart, periodEnd,
            aggregate.totalSalesAmount, aggregate.totalRefundAmount,
            aggregate.paidCount, aggregate.refundCount
        );
        settlementReportRepository.save(report);

        List<SettlementItem> items = new ArrayList<>();
        for (PaymentAggRow row : aggregate.paymentRows) {
            items.add(SettlementItem.create(report.getSettlementId(), row.paymentId, row.amount, SettlementItemType.PAYMENT));
        }
        for (RefundAggRow row : aggregate.refundRows) {
            items.add(SettlementItem.create(report.getSettlementId(), row.paymentId, row.amount, SettlementItemType.REFUND));
        }
        settlementItemRepository.saveAll(items);

        saveAuditLog(adminId, "GENERATE_SETTLEMENT", report.getSettlementId(), ipAddress);

        return new SettlementDTO.ResponseList(
            report.getSettlementId(),
            report.getSettlementPeriodStart(),
            report.getSettlementPeriodEnd(),
            report.getTotalSalesAmount(),
            report.getTotalRefundAmount(),
            report.getNetSalesAmount(),
            report.getTotalTransactionCount(),
            report.getSettlementStatus(),
            report.getCreatedAt()
        );
    }

    @Override
    @Transactional
    public SettlementDTO.ResponseConfirm confirmSettlement(Long settlementId,
                                                           SettlementDTO.RequestConfirm request,
                                                           Long adminId, String ipAddress) {
        SettlementReport report = settlementReportRepository.findById(settlementId)
            .orElseThrow(() -> new CustomException(AdminSettlementErrorCode.SETTLEMENT_NOT_FOUND));

        report.confirm(adminId, request.note());

        try {
            settlementReportRepository.saveAndFlush(report);
        } catch (OptimisticLockingFailureException e) {
            throw new CustomException(AdminSettlementErrorCode.ALREADY_CONFIRMED);
        }

        saveAuditLog(adminId, "CONFIRM_SETTLEMENT", report.getSettlementId(), ipAddress);

        return new SettlementDTO.ResponseConfirm(
            report.getSettlementId(),
            report.getSettlementStatus(),
            report.getSettledAt()
        );
    }

    private AggregateResult aggregatePaymentsAndRefunds(LocalDate periodStart, LocalDate periodEnd) {
        // periodEnd는 관리자가 고른 마지막 날짜를 포함(inclusive)하므로, 실제 상한은 그 다음날 자정으로 잡는다.
        // KST 벽시계 문자열을 AT TIME ZONE으로 명시 고정해 DB 세션 타임존에 따른 경계 오분류를 방지한다.
        String rangeStart = periodStart.atStartOfDay().toString();
        String rangeEnd = periodEnd.plusDays(1).atStartOfDay().toString();

        String paymentSql = """
            SELECT p.payment_id, p.amount
            FROM payments p
            WHERE p.payment_status = 'PAID'
              AND p.approved_at >= (CAST(?1 AS TIMESTAMP) AT TIME ZONE 'Asia/Seoul')
              AND p.approved_at <  (CAST(?2 AS TIMESTAMP) AT TIME ZONE 'Asia/Seoul')
            """;

        Query paymentQuery = em.createNativeQuery(paymentSql);
        paymentQuery.setParameter(1, rangeStart);
        paymentQuery.setParameter(2, rangeEnd);

        @SuppressWarnings("unchecked")
        List<Object[]> paymentRows = paymentQuery.getResultList();

        long totalSalesAmount = 0;
        List<PaymentAggRow> pRows = new ArrayList<>();
        for (Object[] row : paymentRows) {
            UUID paymentId = UUID.fromString(row[0].toString());
            int amount = ((Number) row[1]).intValue();
            totalSalesAmount += amount;
            pRows.add(new PaymentAggRow(paymentId, amount));
        }

        String refundSql = """
            SELECT r.payment_id, r.amount
            FROM refunds r
            WHERE r.refund_status = 'COMPLETED'
              AND r.refunded_at >= (CAST(?1 AS TIMESTAMP) AT TIME ZONE 'Asia/Seoul')
              AND r.refunded_at <  (CAST(?2 AS TIMESTAMP) AT TIME ZONE 'Asia/Seoul')
            """;

        Query refundQuery = em.createNativeQuery(refundSql);
        refundQuery.setParameter(1, rangeStart);
        refundQuery.setParameter(2, rangeEnd);

        @SuppressWarnings("unchecked")
        List<Object[]> refundRows = refundQuery.getResultList();

        long totalRefundAmount = 0;
        List<RefundAggRow> rRows = new ArrayList<>();
        for (Object[] row : refundRows) {
            UUID paymentId = UUID.fromString(row[0].toString());
            int amount = ((Number) row[1]).intValue();
            totalRefundAmount += amount;
            rRows.add(new RefundAggRow(paymentId, amount));
        }

        return new AggregateResult(totalSalesAmount, totalRefundAmount,
            pRows.size(), rRows.size(), pRows, rRows);
    }

    private void saveAuditLog(Long adminId, String action, Long targetId, String ipAddress) {
        AuditLog auditLog = AuditLog.create(
            adminId,
            AuditLogType.SETTLEMENT_ACTIVITY,
            action,
            TARGET_TYPE,
            String.valueOf(targetId),
            ipAddress,
            AuditLogSeverity.INFO,
            null
        );
        auditLogRepository.save(auditLog);
    }

    private record PaymentAggRow(UUID paymentId, int amount) {}
    private record RefundAggRow(UUID paymentId, int amount) {}
    private record AggregateResult(long totalSalesAmount, long totalRefundAmount,
                                   int paidCount, int refundCount,
                                   List<PaymentAggRow> paymentRows,
                                   List<RefundAggRow> refundRows) {}
}
