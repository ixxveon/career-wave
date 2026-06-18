package kr.co.carrer.admin.stats.service.impl;

import kr.co.carrer.admin.stats.dto.StatisticsDTO;
import kr.co.carrer.admin.stats.repository.AdminStatisticsQueryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AdminStatisticsServiceImplTest {

    @InjectMocks
    private AdminStatisticsServiceImpl adminStatisticsService;

    @Mock
    private AdminStatisticsQueryRepository queryRepository;

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // ── getSummary ────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("KPI 집계 조회 - getSummary()")
    class GetSummary {

        @Test
        @DisplayName("전월 데이터 있을 때 증감률 정상 계산")
        void getSummary_withPrevData_calculatesGrowth() {
            given(queryRepository.sumPaidAmountByMonth(0, 0)).willReturn(110000L);
            given(queryRepository.sumPaidAmountByMonth(0, -1)).willReturn(100000L);
            given(queryRepository.sumPaidAmountTotal()).willReturn(500000L);
            given(queryRepository.countMembers()).willReturn(200L);
            given(queryRepository.countNewMembersByMonth(0)).willReturn(30L);
            given(queryRepository.countNewMembersByMonth(-1)).willReturn(20L);

            StatisticsDTO.ResponseSummary result = adminStatisticsService.getSummary();

            assertThat(result.currentMonthRevenue()).isEqualTo(110000L);
            assertThat(result.currentMonthRevenueGrowth()).isEqualTo(10.0);
            assertThat(result.totalRevenue()).isEqualTo(500000L);
            assertThat(result.totalMembers()).isEqualTo(200L);
            assertThat(result.currentMonthNewMembers()).isEqualTo(30L);
            assertThat(result.currentMonthNewMembersGrowth()).isEqualTo(50.0);
        }

        @Test
        @DisplayName("전월 매출 0이면 매출 증감률 0.0 반환")
        void getSummary_prevRevenueZero_returnsZeroGrowth() {
            given(queryRepository.sumPaidAmountByMonth(0, 0)).willReturn(50000L);
            given(queryRepository.sumPaidAmountByMonth(0, -1)).willReturn(0L);
            given(queryRepository.sumPaidAmountTotal()).willReturn(50000L);
            given(queryRepository.countMembers()).willReturn(10L);
            given(queryRepository.countNewMembersByMonth(0)).willReturn(5L);
            given(queryRepository.countNewMembersByMonth(-1)).willReturn(3L);

            StatisticsDTO.ResponseSummary result = adminStatisticsService.getSummary();

            assertThat(result.currentMonthRevenueGrowth()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("전월 신규 가입 0이면 신규 가입 증감률 0.0 반환")
        void getSummary_prevNewMembersZero_returnsZeroGrowth() {
            given(queryRepository.sumPaidAmountByMonth(0, 0)).willReturn(50000L);
            given(queryRepository.sumPaidAmountByMonth(0, -1)).willReturn(40000L);
            given(queryRepository.sumPaidAmountTotal()).willReturn(90000L);
            given(queryRepository.countMembers()).willReturn(10L);
            given(queryRepository.countNewMembersByMonth(0)).willReturn(5L);
            given(queryRepository.countNewMembersByMonth(-1)).willReturn(0L);

            StatisticsDTO.ResponseSummary result = adminStatisticsService.getSummary();

            assertThat(result.currentMonthNewMembersGrowth()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("당월·전월 모두 0이면 증감률 0.0 반환")
        void getSummary_bothZero_returnsZeroGrowth() {
            given(queryRepository.sumPaidAmountByMonth(anyInt(), anyInt())).willReturn(0L);
            given(queryRepository.sumPaidAmountTotal()).willReturn(0L);
            given(queryRepository.countMembers()).willReturn(0L);
            given(queryRepository.countNewMembersByMonth(anyInt())).willReturn(0L);

            StatisticsDTO.ResponseSummary result = adminStatisticsService.getSummary();

            assertThat(result.currentMonthRevenueGrowth()).isEqualTo(0.0);
            assertThat(result.currentMonthNewMembersGrowth()).isEqualTo(0.0);
        }
    }

    // ── getRecentSubscribers ──────────────────────────────────────────────────

    @Nested
    @DisplayName("최근 가입 피드 - getRecentSubscribers()")
    class GetRecentSubscribers {

        @Test
        @DisplayName("이름 2자 이상이면 앞 2자 이니셜 반환")
        void recentSubscribers_longName_returnsFirst2Chars() {
            ZonedDateTime createdAt = ZonedDateTime.now(KST).minusMinutes(30);
            Object[] row = {"uuid-1", "김철수", "ACTIVE", "프리미엄", createdAt};
            given(queryRepository.findRecentSubscribers()).willReturn(rowList(row));
            given(queryRepository.toZdtPublic(createdAt)).willReturn(createdAt);

            List<StatisticsDTO.RecentSubscriber> result = adminStatisticsService.getRecentSubscribers();

            assertThat(result.get(0).initials()).isEqualTo("김철");
        }

        @Test
        @DisplayName("이름 1자이면 그대로 이니셜 반환")
        void recentSubscribers_shortName_returnsSingleChar() {
            ZonedDateTime createdAt = ZonedDateTime.now(KST).minusHours(2);
            Object[] row = {"uuid-2", "김", "ACTIVE", "프리미엄", createdAt};
            given(queryRepository.findRecentSubscribers()).willReturn(rowList(row));
            given(queryRepository.toZdtPublic(createdAt)).willReturn(createdAt);

            List<StatisticsDTO.RecentSubscriber> result = adminStatisticsService.getRecentSubscribers();

            assertThat(result.get(0).initials()).isEqualTo("김");
        }

        @Test
        @DisplayName("60분 미만 → N분 전")
        void recentSubscribers_within60min_returnsMinutesAgo() {
            ZonedDateTime createdAt = ZonedDateTime.now(KST).minusMinutes(45);
            Object[] row = {"uuid-1", "김철수", "ACTIVE", "프리미엄", createdAt};
            given(queryRepository.findRecentSubscribers()).willReturn(rowList(row));
            given(queryRepository.toZdtPublic(createdAt)).willReturn(createdAt);

            List<StatisticsDTO.RecentSubscriber> result = adminStatisticsService.getRecentSubscribers();

            assertThat(result.get(0).timeAgo()).contains("분 전");
        }

        @Test
        @DisplayName("1시간 이상 24시간 미만 → N시간 전")
        void recentSubscribers_within24h_returnsHoursAgo() {
            ZonedDateTime createdAt = ZonedDateTime.now(KST).minusHours(5);
            Object[] row = {"uuid-1", "이영희", "ACTIVE", "프리미엄", createdAt};
            given(queryRepository.findRecentSubscribers()).willReturn(rowList(row));
            given(queryRepository.toZdtPublic(createdAt)).willReturn(createdAt);

            List<StatisticsDTO.RecentSubscriber> result = adminStatisticsService.getRecentSubscribers();

            assertThat(result.get(0).timeAgo()).contains("시간 전");
        }

        @Test
        @DisplayName("24시간 이상 → N일 전")
        void recentSubscribers_over24h_returnsDaysAgo() {
            ZonedDateTime createdAt = ZonedDateTime.now(KST).minusDays(3);
            Object[] row = {"uuid-1", "박지수", "CANCEL_SCHEDULED", "프리미엄", createdAt};
            given(queryRepository.findRecentSubscribers()).willReturn(rowList(row));
            given(queryRepository.toZdtPublic(createdAt)).willReturn(createdAt);

            List<StatisticsDTO.RecentSubscriber> result = adminStatisticsService.getRecentSubscribers();

            assertThat(result.get(0).timeAgo()).contains("일 전");
        }

        @Test
        @DisplayName("createdAt null이면 timeAgo '-' 반환")
        void recentSubscribers_nullCreatedAt_returnsDash() {
            Object[] row = {"uuid-1", "홍길동", "ACTIVE", "프리미엄", null};
            given(queryRepository.findRecentSubscribers()).willReturn(rowList(row));
            given(queryRepository.toZdtPublic(null)).willReturn(null);

            List<StatisticsDTO.RecentSubscriber> result = adminStatisticsService.getRecentSubscribers();

            assertThat(result.get(0).timeAgo()).isEqualTo("-");
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private List<Object[]> rowList(Object[]... rows) {
        List<Object[]> list = new ArrayList<>();
        for (Object[] row : rows) list.add(row);
        return list;
    }
}
