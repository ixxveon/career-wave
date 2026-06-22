package kr.co.carrer.admin.stats.dto;

public class StatisticsDTO {

    public record ResponseSummary(
        long currentMonthRevenue,
        double currentMonthRevenueGrowth,
        long totalRevenue,
        long totalMembers,
        long currentMonthNewMembers,
        double currentMonthNewMembersGrowth
    ) {}

    public record MonthlyRevenue(
        String month,
        long total
    ) {}

    public record RevenueBreakdownItem(
        String type,
        String label,
        long amount,
        double growth
    ) {}

    public record MonthlySubscribers(
        String month,
        long newSubs,
        long churned
    ) {}

    public record RecentSubscriber(
        String memberId,
        String initials,
        String memberName,
        String subStatus,
        String plan,
        String timeAgo
    ) {}
}
