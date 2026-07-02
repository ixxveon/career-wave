package kr.co.carrer.user.jobnotice.service;

import kr.co.carrer.global.config.CacheConfig;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.repository.JobNoticeQueryRepository;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobType;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobNoticeCacheService {

    private final JobNoticeQueryRepository jobNoticeQueryRepository;

    @Cacheable(value = CacheConfig.JOB_NOTICE_LIST)
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseList getAnonymousJobNoticeList(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period,
            String sort,
            int page,
            int size
    ) {
        PageRequest pageRequest = PageRequest.of(page - 1, size);

        List<JobNotice> jobNotices = jobNoticeQueryRepository.findActiveJobNoticeContent(
                keyword, jobType, jobCategory, careerLevel, location, companySize,
                period, sort, pageRequest
        );
        long totalElements = getActiveJobNoticeCount(
                keyword, jobType, jobCategory, careerLevel, location, companySize, period
        );
        int totalPages = (int) Math.ceil((double) totalElements / size);

        List<JobNoticeDTO.ResponseSummary> content = jobNotices.stream()
                .map(this::toAnonymousResponseSummary)
                .toList();

        return new JobNoticeDTO.ResponseList(
                content,
                page,
                size,
                totalElements,
                totalPages,
                getListStats(),
                getFilterOptions()
        );
    }

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

    @Cacheable(
            value = CacheConfig.JOB_NOTICE_LIST_COUNT,
            key = "#keyword + '|' + #jobType + '|' + #jobCategory + '|' + #careerLevel + '|' + #location + '|' + #companySize + '|' + #period"
    )
    @Transactional(readOnly = true)
    public long getActiveJobNoticeCount(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period
    ) {
        return jobNoticeQueryRepository.countActiveJobNotices(
                keyword, jobType, jobCategory, careerLevel, location, companySize, period
        );
    }

    private JobNoticeDTO.ResponseSummary toAnonymousResponseSummary(JobNotice jobNotice) {
        return new JobNoticeDTO.ResponseSummary(
                jobNotice.getJobNoticeId(),
                jobNotice.getCompanyName(),
                jobNotice.getTitle(),
                toList(jobNotice.getSkillTags()),
                jobNotice.getJobType(),
                jobNotice.getCompanySize(),
                toList(jobNotice.getJobCategory()),
                jobNotice.getCareerLevel(),
                jobNotice.getLocation(),
                jobNotice.getSalary(),
                jobNotice.getNoticeStatus(),
                jobNotice.getSource(),
                jobNotice.getViewCount(),
                jobNotice.getDeadline(),
                jobNotice.getCreatedAt(),
                false
        );
    }

    private List<String> toList(String[] values) {
        if (values == null) {
            return null;
        }
        return Arrays.asList(values);
    }
}
