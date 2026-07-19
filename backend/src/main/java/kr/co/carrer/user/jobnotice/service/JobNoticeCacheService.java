package kr.co.carrer.user.jobnotice.service;

import kr.co.carrer.global.config.CacheConfig;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.repository.JobNoticeQueryRepository;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
public class JobNoticeCacheService {

    private final JobNoticeQueryRepository jobNoticeQueryRepository;
    private final JobNoticeCacheService self;

    public JobNoticeCacheService(
            JobNoticeQueryRepository jobNoticeQueryRepository,
            @Lazy JobNoticeCacheService self
    ) {
        this.jobNoticeQueryRepository = jobNoticeQueryRepository;
        this.self = self;
    }

    @Cacheable(
            value = CacheConfig.JOB_NOTICE_LIST,
            key = "{#keyword, T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#jobTypes), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#jobCategories), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#careerLevels), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#locations), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#companySizes), #period, #sort, #page, #size}"
    )
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseList getAnonymousJobNoticeList(
            String keyword,
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            String period,
            String sort,
            int page,
            int size
    ) {
        PageRequest pageRequest = PageRequest.of(page - 1, size);

        List<JobNotice> jobNotices = jobNoticeQueryRepository.findActiveJobNoticeContent(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes,
                period, sort, pageRequest
        );
        long totalElements = self.getActiveJobNoticeCount(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes, period
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
                self.getListStats(),
                self.getFilterOptions()
        );
    }

    @Cacheable(value = CacheConfig.JOB_NOTICE_FILTER_OPTIONS, key = "'all'")
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseFilterOptions getFilterOptions() {
        return new JobNoticeDTO.ResponseFilterOptions(
                JobNoticeFilterDictionary.JOB_TYPES,
                JobNoticeFilterDictionary.JOB_CATEGORIES,
                JobNoticeFilterDictionary.CAREER_LEVELS,
                JobNoticeFilterDictionary.LOCATIONS,
                JobNoticeFilterDictionary.COMPANY_SIZES,
                JobNoticeFilterDictionary.CAREER_LEVELS,
                JobNoticeFilterDictionary.DEADLINE_TYPES,
                JobNoticeFilterDictionary.SOURCES
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
            key = "{#keyword, T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#jobTypes), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#jobCategories), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#careerLevels), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#locations), T(kr.co.carrer.user.jobnotice.service.JobNoticeCacheService).normalizeFilterValues(#companySizes), #period}"
    )
    @Transactional(readOnly = true)
    public long getActiveJobNoticeCount(
            String keyword,
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            String period
    ) {
        return jobNoticeQueryRepository.countActiveJobNotices(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes, period
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
                false,
                jobNotice.getCompanyLogoUrl()
        );
    }

    private List<String> toList(String[] values) {
        if (values == null) {
            return null;
        }
        return Arrays.asList(values);
    }

    public static List<String> normalizeFilterValues(List<?> values) {
        if (values == null) {
            return List.of();
        }

        return values.stream()
                .filter(Objects::nonNull)
                .map(value -> value instanceof Enum<?> enumValue ? enumValue.name() : value.toString().trim())
                .filter(value -> !value.isBlank())
                .distinct()
                .sorted()
                .toList();
    }
}
