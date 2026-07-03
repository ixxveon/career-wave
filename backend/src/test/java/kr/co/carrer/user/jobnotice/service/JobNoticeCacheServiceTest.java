package kr.co.carrer.user.jobnotice.service;

import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.repository.JobNoticeQueryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class JobNoticeCacheServiceTest {

    @Mock
    private JobNoticeQueryRepository jobNoticeQueryRepository;

    @InjectMocks
    private JobNoticeCacheService jobNoticeCacheService;

    @Test
    @DisplayName("getListStats — 정상: 오늘 신규 비율을 소수점 둘째 자리로 반올림한다")
    void getListStats_normalCase() {
        given(jobNoticeQueryRepository.countActiveJobNotices()).willReturn(10L);
        given(jobNoticeQueryRepository.countTodayNewActiveJobNotices()).willReturn(2L);

        JobNoticeDTO.ResponseListStats result = jobNoticeCacheService.getListStats();

        assertThat(result.totalOpenCount()).isEqualTo(10L);
        assertThat(result.todayNewCount()).isEqualTo(2L);
        assertThat(result.todayNewRate()).isEqualTo(20.0);
    }

    @Test
    @DisplayName("getListStats — 총 공고 0건: 0 나누기 방지, todayNewRate가 0.0이어야 한다")
    void getListStats_zeroTotalGuard() {
        given(jobNoticeQueryRepository.countActiveJobNotices()).willReturn(0L);
        given(jobNoticeQueryRepository.countTodayNewActiveJobNotices()).willReturn(0L);

        JobNoticeDTO.ResponseListStats result = jobNoticeCacheService.getListStats();

        assertThat(result.totalOpenCount()).isEqualTo(0L);
        assertThat(result.todayNewRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("getFilterOptions — 레포지토리 Distinct 조회 결과를 DTO로 반환한다")
    void getFilterOptions_delegatesToRepository() {
        given(jobNoticeQueryRepository.findDistinctActiveJobTypes()).willReturn(List.of("FULLTIME", "CONTRACT"));
        given(jobNoticeQueryRepository.findDistinctActiveJobCategories()).willReturn(List.of("BACKEND"));
        given(jobNoticeQueryRepository.findDistinctActiveCareerLevels()).willReturn(List.of("JUNIOR"));
        given(jobNoticeQueryRepository.findDistinctActiveLocations()).willReturn(List.of("Seoul"));
        given(jobNoticeQueryRepository.findDistinctActiveCompanySizes()).willReturn(List.of("STARTUP"));

        JobNoticeDTO.ResponseFilterOptions result = jobNoticeCacheService.getFilterOptions();

        assertThat(result.jobType()).containsExactly("FULLTIME", "CONTRACT");
        assertThat(result.jobCategory()).containsExactly("BACKEND");
    }
}
