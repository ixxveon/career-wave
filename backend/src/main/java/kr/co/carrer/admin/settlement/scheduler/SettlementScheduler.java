package kr.co.carrer.admin.settlement.scheduler;

import kr.co.carrer.admin.settlement.dto.SettlementDTO;
import kr.co.carrer.admin.settlement.service.AdminSettlementService;
import kr.co.carrer.admin.settlement.type.SettlementStatus;
import kr.co.carrer.admin.settlement.repository.SettlementReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

@Slf4j
@Component
@RequiredArgsConstructor
public class SettlementScheduler {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final AdminSettlementService adminSettlementService;
    private final SettlementReportRepository settlementReportRepository;

    @Scheduled(cron = "0 0 0 1 * *", zone = "Asia/Seoul")
    public void generateMonthlySettlement() {
        YearMonth lastMonth = YearMonth.now(KST).minusMonths(1);
        LocalDate periodStart = lastMonth.atDay(1);
        // periodEnd는 마지막 날짜를 포함(inclusive)하는 값으로 저장한다 — 수동 생성(FE 입력)과 규약을 통일.
        LocalDate periodEnd = lastMonth.atEndOfMonth();

        boolean exists = settlementReportRepository
            .findBySettlementPeriodStartAndSettlementPeriodEnd(periodStart, periodEnd)
            .isPresent();

        if (exists) {
            log.info("정산 리포트 이미 존재: {} ~ {}", periodStart, periodEnd);
            return;
        }

        try {
            SettlementDTO.RequestGenerate request = new SettlementDTO.RequestGenerate(periodStart, periodEnd);
            adminSettlementService.generateSettlement(request, null, "SCHEDULER");
            log.info("정산 리포트 자동 생성 완료: {} ~ {}", periodStart, periodEnd);
        } catch (Exception e) {
            log.error("정산 리포트 자동 생성 실패: {} ~ {} - {}", periodStart, periodEnd, e.getMessage(), e);
        }
    }
}
