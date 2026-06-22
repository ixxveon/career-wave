package kr.co.carrer.admin.stats.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.admin.stats.dto.StatisticsDTO;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;

import java.util.List;

@Tag(name = "Admin Statistics", description = "관리자 서비스 통계 API")
public interface AdminStatisticsControllerDocs {

    @Operation(summary = "KPI 집계 조회 (당월 매출·신규 가입·누적)")
    ResponseEntity<ApiResponse<StatisticsDTO.ResponseSummary>> getSummary();

    @Operation(summary = "월별 매출 추이 (최근 6개월)")
    ResponseEntity<ApiResponse<List<StatisticsDTO.MonthlyRevenue>>> getMonthlyRevenue();

    @Operation(summary = "월별 구독자 변동 추이 (최근 6개월)")
    ResponseEntity<ApiResponse<List<StatisticsDTO.MonthlySubscribers>>> getMonthlySubscribers();

    @Operation(summary = "최근 가입 피드 (상위 5건)")
    ResponseEntity<ApiResponse<List<StatisticsDTO.RecentSubscriber>>> getRecentSubscribers();

    @Operation(summary = "구독 유형별 매출 실적 (당월 / 결제 방식별)")
    ResponseEntity<ApiResponse<List<StatisticsDTO.RevenueBreakdownItem>>> getRevenueBreakdown();
}
