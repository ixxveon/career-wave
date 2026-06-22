package kr.co.carrer.admin.stats.service;

import kr.co.carrer.admin.stats.dto.StatisticsDTO;

import java.util.List;

public interface AdminStatisticsService {

    StatisticsDTO.ResponseSummary getSummary();

    List<StatisticsDTO.MonthlyRevenue> getMonthlyRevenue();

    List<StatisticsDTO.MonthlySubscribers> getMonthlySubscribers();

    List<StatisticsDTO.RecentSubscriber> getRecentSubscribers();

    List<StatisticsDTO.RevenueBreakdownItem> getRevenueBreakdown();
}
