package kr.co.carrer.user.jobnotice.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.entity.Bookmark;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.exception.JobNoticeErrorCode;
import kr.co.carrer.user.jobnotice.repository.BookmarkRepository;
import kr.co.carrer.user.jobnotice.repository.JobNoticeRepository;
import kr.co.carrer.user.jobnotice.repository.JobNoticeQueryRepository;
import kr.co.carrer.user.jobnotice.service.UserJobNoticeService;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserJobNoticeServiceImpl implements UserJobNoticeService {

    private static final int DEFAULT_PAGE = 1;
    private static final int MAX_SIZE = 100;

    private final JobNoticeQueryRepository jobNoticeQueryRepository;
    private final JobNoticeRepository jobNoticeRepository;
    private final BookmarkRepository bookmarkRepository;

    @Override
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseList getJobNotices(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period,
            String sort,
            int page,
            int size,
            UUID memberId
    ) {
        int normalizedPage = Math.max(page, DEFAULT_PAGE);
        int normalizedSize = Math.min(Math.max(size, 1), MAX_SIZE);

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                keyword,
                jobType,
                jobCategory,
                careerLevel,
                location,
                companySize,
                period,
                sort,
                PageRequest.of(normalizedPage - 1, normalizedSize)
        );

        Set<Long> bookmarkedJobNoticeIds = getBookmarkedJobNoticeIds(memberId, result.getContent());
        List<JobNoticeDTO.ResponseSummary> content = result.getContent().stream()
                .map(jobNotice -> toResponseSummary(jobNotice, bookmarkedJobNoticeIds))
                .toList();

        return new JobNoticeDTO.ResponseList(
                content,
                result.getNumber() + 1,
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public JobNoticeDTO.ResponseDetail getJobNoticeDetail(Long jobNoticeId, UUID memberId) {
        JobNotice jobNotice = jobNoticeQueryRepository.findActiveJobNoticeById(jobNoticeId)
                .orElseThrow(() -> new CustomException(JobNoticeErrorCode.JOB_NOTICE_NOT_FOUND));

        return new JobNoticeDTO.ResponseDetail(
                jobNotice.getJobNoticeId(),
                jobNotice.getCompanyName(),
                jobNotice.getTitle(),
                jobNotice.getDescription(),
                toList(jobNotice.getSkillTags()),
                jobNotice.getJobType(),
                jobNotice.getCompanySize(),
                toList(jobNotice.getJobCategory()),
                jobNotice.getCareerLevel(),
                jobNotice.getLocation(),
                jobNotice.getSalary(),
                jobNotice.getNoticeStatus(),
                jobNotice.getOriginalUrl(),
                jobNotice.getSource(),
                jobNotice.getViewCount(),
                jobNotice.getDeadline(),
                jobNotice.getCreatedAt(),
                jobNotice.getUpdatedAt(),
                isBookmarked(memberId, jobNotice.getJobNoticeId())
        );
    }

    @Override
    @Transactional
    public JobNoticeDTO.ResponseBookmark createBookmark(Long jobNoticeId, UUID memberId) {
        jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(jobNoticeId, JobNoticeStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(JobNoticeErrorCode.JOB_NOTICE_NOT_FOUND));

        try {
            Bookmark bookmark = bookmarkRepository.save(Bookmark.of(memberId, jobNoticeId));
            return new JobNoticeDTO.ResponseBookmark(bookmark.getJobNoticeId(), true);
        } catch (DataIntegrityViolationException exception) {
            throw new CustomException(JobNoticeErrorCode.BOOKMARK_ALREADY_EXISTS);
        }
    }

    @Override
    @Transactional
    public JobNoticeDTO.ResponseBookmark deleteBookmark(Long jobNoticeId, UUID memberId) {
        jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(jobNoticeId, JobNoticeStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(JobNoticeErrorCode.JOB_NOTICE_NOT_FOUND));

        Bookmark bookmark = bookmarkRepository.findByMemberIdAndJobNoticeId(memberId, jobNoticeId)
                .orElseThrow(() -> new CustomException(JobNoticeErrorCode.BOOKMARK_NOT_FOUND));

        bookmarkRepository.delete(bookmark);
        return new JobNoticeDTO.ResponseBookmark(jobNoticeId, false);
    }

    private JobNoticeDTO.ResponseSummary toResponseSummary(JobNotice jobNotice, Set<Long> bookmarkedJobNoticeIds) {
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
                bookmarkedJobNoticeIds.contains(jobNotice.getJobNoticeId())
        );
    }

    private Set<Long> getBookmarkedJobNoticeIds(UUID memberId, List<JobNotice> jobNotices) {
        if (memberId == null || jobNotices.isEmpty()) {
            return Collections.emptySet();
        }

        List<Long> jobNoticeIds = jobNotices.stream()
                .map(JobNotice::getJobNoticeId)
                .toList();

        return bookmarkRepository.findByMemberIdAndJobNoticeIdIn(memberId, jobNoticeIds).stream()
                .map(Bookmark::getJobNoticeId)
                .collect(HashSet::new, HashSet::add, HashSet::addAll);
    }

    private boolean isBookmarked(UUID memberId, Long jobNoticeId) {
        if (memberId == null) {
            return false;
        }
        return bookmarkRepository.existsByMemberIdAndJobNoticeId(memberId, jobNoticeId);
    }

    private List<String> toList(String[] values) {
        if (values == null) {
            return null;
        }
        return Arrays.asList(values);
    }
}
