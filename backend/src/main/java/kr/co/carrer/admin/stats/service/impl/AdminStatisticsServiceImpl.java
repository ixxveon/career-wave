package kr.co.carrer.admin.stats.service.impl;

import kr.co.carrer.admin.stats.dto.StatisticsDTO;
import kr.co.carrer.admin.stats.repository.AdminStatisticsQueryRepository;
import kr.co.carrer.admin.stats.service.AdminStatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminStatisticsServiceImpl implements AdminStatisticsService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final AdminStatisticsQueryRepository queryRepository;

    @Override
    @Transactional(readOnly = true)
    public StatisticsDTO.ResponseSummary getSummary() {
        long currentRevenue = queryRepository.sumPaidAmountByMonth(0, 0);
        long prevRevenue    = queryRepository.sumPaidAmountByMonth(0, -1);
        long totalRevenue   = queryRepository.sumPaidAmountTotal();
        long totalMembers   = queryRepository.countMembers();
        long currentNew     = queryRepository.countNewMembersByMonth(0);
        long prevNew        = queryRepository.countNewMembersByMonth(-1);

        double revenueGrowth = prevRevenue == 0 ? 0.0
            : Math.round((double) (currentRevenue - prevRevenue) / prevRevenue * 10000.0) / 100.0;

        double membersGrowth = prevNew == 0 ? 0.0
            : Math.round((double) (currentNew - prevNew) / prevNew * 10000.0) / 100.0;

        return new StatisticsDTO.ResponseSummary(
            currentRevenue, revenueGrowth, totalRevenue,
            totalMembers, currentNew, membersGrowth
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatisticsDTO.MonthlyRevenue> getMonthlyRevenue() {
        return queryRepository.findMonthlyRevenue();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatisticsDTO.MonthlySubscribers> getMonthlySubscribers() {
        return queryRepository.findMonthlySubscribers();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StatisticsDTO.RecentSubscriber> getRecentSubscribers() {
        List<Object[]> rows = queryRepository.findRecentSubscribers();
        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);

        return rows.stream().map(row -> {
            String memberId   = (String) row[0];
            String memberName = (String) row[1];
            String subStatus  = (String) row[2];
            String plan       = (String) row[3];
            ZonedDateTime createdAt = queryRepository.toZdtPublic(row[4]);

            String initials = memberName != null && !memberName.isBlank()
                ? memberName.substring(0, Math.min(2, memberName.length()))
                : "??";

            String timeAgo = formatTimeAgo(now, createdAt);

            return new StatisticsDTO.RecentSubscriber(
                memberId, initials, memberName, subStatus, plan, timeAgo
            );
        }).toList();
    }

    private String formatTimeAgo(ZonedDateTime now, ZonedDateTime target) {
        if (target == null) return "-";
        long minutes = Math.max(0, ChronoUnit.MINUTES.between(target, now));
        if (minutes < 60) return minutes + "분 전";
        long hours = Math.max(0, ChronoUnit.HOURS.between(target, now));
        if (hours < 24) return hours + "시간 전";
        long days = Math.max(0, ChronoUnit.DAYS.between(target, now));
        return days + "일 전";
    }
}
