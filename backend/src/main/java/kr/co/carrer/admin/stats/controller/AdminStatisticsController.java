package kr.co.carrer.admin.stats.controller;

import kr.co.carrer.admin.stats.docs.AdminStatisticsControllerDocs;
import kr.co.carrer.admin.stats.dto.StatisticsDTO;
import kr.co.carrer.admin.stats.service.AdminStatisticsService;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/statistics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminStatisticsController implements AdminStatisticsControllerDocs {

    private final AdminStatisticsService adminStatisticsService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<StatisticsDTO.ResponseSummary>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok("통계 KPI 집계 조회에 성공했습니다.", adminStatisticsService.getSummary()));
    }

    @GetMapping("/revenue/monthly")
    public ResponseEntity<ApiResponse<List<StatisticsDTO.MonthlyRevenue>>> getMonthlyRevenue() {
        return ResponseEntity.ok(ApiResponse.ok("월별 매출 추이 조회에 성공했습니다.", adminStatisticsService.getMonthlyRevenue()));
    }

    @GetMapping("/subscribers/monthly")
    public ResponseEntity<ApiResponse<List<StatisticsDTO.MonthlySubscribers>>> getMonthlySubscribers() {
        return ResponseEntity.ok(ApiResponse.ok("월별 구독자 변동 추이 조회에 성공했습니다.", adminStatisticsService.getMonthlySubscribers()));
    }

    @GetMapping("/subscribers/recent")
    public ResponseEntity<ApiResponse<List<StatisticsDTO.RecentSubscriber>>> getRecentSubscribers() {
        return ResponseEntity.ok(ApiResponse.ok("최근 가입 피드 조회에 성공했습니다.", adminStatisticsService.getRecentSubscribers()));
    }

    @GetMapping("/revenue/breakdown")
    public ResponseEntity<ApiResponse<List<StatisticsDTO.RevenueBreakdownItem>>> getRevenueBreakdown() {
        return ResponseEntity.ok(ApiResponse.ok("구독 유형별 매출 실적 조회에 성공했습니다.", adminStatisticsService.getRevenueBreakdown()));
    }
}
