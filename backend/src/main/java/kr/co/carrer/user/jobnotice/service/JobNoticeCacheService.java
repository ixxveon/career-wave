package kr.co.carrer.user.jobnotice.service;

import kr.co.carrer.global.config.CacheConfig;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.repository.JobNoticeQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class JobNoticeCacheService {

    private final JobNoticeQueryRepository jobNoticeQueryRepository;

    @Cacheable(value = CacheConfig.JOB_NOTICE_FILTER_OPTIONS, key = "'all'")
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseFilterOptions getFilterOptions() {
        return new JobNoticeDTO.ResponseFilterOptions(
                jobNoticeQueryRepository.findDistinctActiveJobTypes(),
                jobNoticeQueryRepository.findDistinctActiveJobCategories(),
                jobNoticeQueryRepository.findDistinctActiveCareerLevels(),
                jobNoticeQueryRepository.findDistinctActiveLocations(),
                jobNoticeQueryRepository.findDistinctActiveCompanySizes()
        );
    }

    @Cacheable(value = CacheConfig.JOB_NOTICE_STATS, key = "'all'")
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseListStats getListStats() {
        long totalOpenCount = jobNoticeQueryRepository.countActiveJobNotices();
        long todayNewCount = jobNoticeQueryRepository.countTodayNewActiveJobNotices();
        double todayNewRate = totalOpenCount == 0
                ? 0
                : Math.round((todayNewCount * 10000.0) / totalOpenCount) / 100.0;

        return new JobNoticeDTO.ResponseListStats(
                totalOpenCount,
                todayNewCount,
                null,
                todayNewRate
        );
    }
}
