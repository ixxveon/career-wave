package kr.co.carrer.user.jobnotice.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.entity.Bookmark;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.exception.JobNoticeErrorCode;
import kr.co.carrer.user.jobnotice.repository.BookmarkRepository;
import kr.co.carrer.user.jobnotice.repository.JobNoticeQueryRepository;
import kr.co.carrer.user.jobnotice.repository.JobNoticeRepository;
import kr.co.carrer.user.jobnotice.service.JobNoticeCacheService;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class UserJobNoticeServiceImplTest {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @InjectMocks
    private UserJobNoticeServiceImpl userJobNoticeService;

    @Mock
    private JobNoticeQueryRepository jobNoticeQueryRepository;

    @Mock
    private JobNoticeRepository jobNoticeRepository;

    @Mock
    private BookmarkRepository bookmarkRepository;

    @Mock
    private JobNoticeCacheService jobNoticeCacheService;

    @Nested
    @DisplayName("채용 공고 목록 조회 - getJobNotices()")
    class GetJobNotices {

        @Test
        @DisplayName("공개 채용 공고 목록 조회 성공")
        void getJobNotices_success() {
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );
            given(jobNoticeCacheService.getAnonymousJobNoticeList(
                    eq("backend"),
                    eq(JobType.FULLTIME),
                    eq("BACKEND"),
                    eq(CareerLevel.JUNIOR),
                    eq("Seoul"),
                    eq(CompanySize.STARTUP),
                    eq("7d"),
                    eq("latest"),
                    eq(1),
                    eq(20)
            )).willReturn(new JobNoticeDTO.ResponseList(
                    List.of(new JobNoticeDTO.ResponseSummary(
                            jobNotice.getJobNoticeId(),
                            jobNotice.getCompanyName(),
                            jobNotice.getTitle(),
                            List.of(jobNotice.getSkillTags()),
                            jobNotice.getJobType(),
                            jobNotice.getCompanySize(),
                            List.of(jobNotice.getJobCategory()),
                            jobNotice.getCareerLevel(),
                            jobNotice.getLocation(),
                            jobNotice.getSalary(),
                            jobNotice.getNoticeStatus(),
                            jobNotice.getSource(),
                            jobNotice.getViewCount(),
                            jobNotice.getDeadline(),
                            jobNotice.getCreatedAt(),
                            false
                    )),
                    1, 20, 1, 1,
                    new JobNoticeDTO.ResponseListStats(10L, 2L, null, 20.0),
                    new JobNoticeDTO.ResponseFilterOptions(
                            List.of("FULLTIME"),
                            List.of("BACKEND"),
                            List.of("JUNIOR"),
                            List.of("Seoul"),
                            List.of("STARTUP")
                    )
            ));

            JobNoticeDTO.ResponseList response = userJobNoticeService.getJobNotices(
                    "backend",
                    JobType.FULLTIME,
                    "BACKEND",
                    CareerLevel.JUNIOR,
                    "Seoul",
                    CompanySize.STARTUP,
                    "7d",
                    "latest",
                    1,
                    20,
                    null
            );

            assertThat(response.content()).hasSize(1);
            assertThat(response.page()).isEqualTo(1);
            assertThat(response.size()).isEqualTo(20);
            assertThat(response.totalElements()).isEqualTo(1);
            assertThat(response.totalPages()).isEqualTo(1);
            assertThat(response.stats().totalOpenCount()).isEqualTo(10);
            assertThat(response.stats().todayNewCount()).isEqualTo(2);
            assertThat(response.stats().todayNewDelta()).isNull();
            assertThat(response.stats().todayNewRate()).isEqualTo(20.0);
            assertThat(response.filterOptions().jobType()).containsExactly("FULLTIME");
            assertThat(response.filterOptions().jobCategory()).containsExactly("BACKEND");
            assertThat(response.filterOptions().careerLevel()).containsExactly("JUNIOR");
            assertThat(response.filterOptions().location()).containsExactly("Seoul");
            assertThat(response.filterOptions().companySize()).containsExactly("STARTUP");

            JobNoticeDTO.ResponseSummary summary = response.content().getFirst();
            assertThat(summary.jobNoticeId()).isEqualTo(101L);
            assertThat(summary.companyName()).isEqualTo("CareerWave");
            assertThat(summary.title()).isEqualTo("백엔드 개발자");
            assertThat(summary.skillTags()).containsExactly("Java", "Spring Boot");
            assertThat(summary.jobCategory()).containsExactly("BACKEND");
            assertThat(summary.jobType()).isEqualTo(JobType.FULLTIME);
            assertThat(summary.companySize()).isEqualTo(CompanySize.STARTUP);
            assertThat(summary.careerLevel()).isEqualTo(CareerLevel.JUNIOR);
            assertThat(summary.location()).isEqualTo("Seoul");
            assertThat(summary.salary()).isEqualTo("면접 후 협의");
            assertThat(summary.noticeStatus()).isEqualTo(JobNoticeStatus.ACTIVE);
            assertThat(summary.source()).isEqualTo("WANTED");
            assertThat(summary.viewCount()).isEqualTo(123);
            assertThat(summary.deadline()).isEqualTo(LocalDate.of(2026, 6, 30));
            assertThat(summary.createdAt()).isEqualTo(ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID));
            assertThat(summary.bookmarked()).isFalse();
        }

        @Test
        @DisplayName("로그인 목록 조회 시 bookmarked 계산")
        void getJobNotices_bookmarkedCalculatedForMember() {
            UUID memberId = UUID.randomUUID();
            JobNotice firstJobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );
            JobNotice secondJobNotice = createJobNotice(
                    102L,
                    "CareerWave",
                    "프론트엔드 개발자",
                    new String[]{"TypeScript", "React"},
                    new String[]{"FRONTEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.SENIOR,
                    "Seoul",
                    "협의",
                    "WANTED",
                    87,
                    LocalDate.of(2026, 7, 7),
                    ZonedDateTime.of(2026, 6, 2, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );
            given(jobNoticeQueryRepository.findActiveJobNoticeContent(
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    any(PageRequest.class)
            )).willReturn(List.of(firstJobNotice, secondJobNotice));
            given(jobNoticeCacheService.getActiveJobNoticeCount(
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null),
                    eq(null)
            )).willReturn(2L);
            given(bookmarkRepository.findByMemberIdAndJobNoticeIdIn(memberId, List.of(101L, 102L)))
                    .willReturn(List.of(Bookmark.of(memberId, secondJobNotice)));
            given(jobNoticeCacheService.getListStats()).willReturn(
                    new JobNoticeDTO.ResponseListStats(2L, 1L, null, 50.0)
            );
            given(jobNoticeCacheService.getFilterOptions()).willReturn(
                    new JobNoticeDTO.ResponseFilterOptions(
                            List.of("FULLTIME"),
                            List.of("BACKEND", "FRONTEND"),
                            List.of("JUNIOR", "SENIOR"),
                            List.of("Seoul"),
                            List.of("STARTUP")
                    )
            );

            JobNoticeDTO.ResponseList response = userJobNoticeService.getJobNotices(
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    1,
                    20,
                    memberId
            );

            assertThat(response.content()).hasSize(2);
            assertThat(response.content().get(0).bookmarked()).isFalse();
            assertThat(response.content().get(1).bookmarked()).isTrue();
        }
    }

    @Nested
    @DisplayName("채용 공고 상세 조회 - getJobNoticeDetail()")
    class GetJobNoticeDetail {

        @Test
        @DisplayName("공개 채용 공고 상세 조회 성공")
        void getJobNoticeDetail_success() {
            UUID memberId = UUID.randomUUID();
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );

            given(jobNoticeQueryRepository.findActiveJobNoticeById(101L))
                    .willReturn(Optional.of(jobNotice));
            given(bookmarkRepository.existsByMemberIdAndJobNoticeId(memberId, 101L))
                    .willReturn(true);

            JobNoticeDTO.ResponseDetail response = userJobNoticeService.getJobNoticeDetail(101L, memberId);

            assertThat(response.jobNoticeId()).isEqualTo(101L);
            assertThat(response.companyName()).isEqualTo("CareerWave");
            assertThat(response.title()).isEqualTo("백엔드 개발자");
            assertThat(response.description()).isEqualTo("Spring Boot 기반 백엔드 개발");
            assertThat(response.skillTags()).containsExactly("Java", "Spring Boot");
            assertThat(response.jobType()).isEqualTo(JobType.FULLTIME);
            assertThat(response.companySize()).isEqualTo(CompanySize.STARTUP);
            assertThat(response.jobCategory()).containsExactly("BACKEND");
            assertThat(response.careerLevel()).isEqualTo(CareerLevel.JUNIOR);
            assertThat(response.location()).isEqualTo("Seoul");
            assertThat(response.salary()).isEqualTo("면접 후 협의");
            assertThat(response.noticeStatus()).isEqualTo(JobNoticeStatus.ACTIVE);
            assertThat(response.originalUrl()).isEqualTo("https://example.com/job/101");
            assertThat(response.source()).isEqualTo("WANTED");
            assertThat(response.viewCount()).isEqualTo(123);
            assertThat(response.deadline()).isEqualTo(LocalDate.of(2026, 6, 30));
            assertThat(response.createdAt()).isEqualTo(ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID));
            assertThat(response.updatedAt()).isEqualTo(ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID));
            assertThat(response.bookmarked()).isTrue();
        }

        @Test
        @DisplayName("비로그인 상세 조회 시 bookmarked는 false")
        void getJobNoticeDetail_guestBookmarkedFalse() {
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );

            given(jobNoticeQueryRepository.findActiveJobNoticeById(101L))
                    .willReturn(Optional.of(jobNotice));

            JobNoticeDTO.ResponseDetail response = userJobNoticeService.getJobNoticeDetail(101L, null);

            assertThat(response.bookmarked()).isFalse();
            verifyNoInteractions(bookmarkRepository);
        }

        @Test
        @DisplayName("비공개 또는 존재하지 않는 공고 상세 조회 시 JOB_NOTICE_NOT_FOUND 예외")
        void getJobNoticeDetail_notFoundThrows() {
            given(jobNoticeQueryRepository.findActiveJobNoticeById(999L))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> userJobNoticeService.getJobNoticeDetail(999L, null))
                    .isInstanceOf(CustomException.class)
                    .extracting(exception -> ((CustomException) exception).getErrorCode())
                    .isEqualTo(JobNoticeErrorCode.JOB_NOTICE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("북마크 등록 - createBookmark()")
    class CreateBookmark {

        @Test
        @DisplayName("북마크 등록 성공")
        void createBookmark_success() {
            UUID memberId = UUID.randomUUID();
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );

            given(jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(101L, JobNoticeStatus.ACTIVE))
                    .willReturn(Optional.of(jobNotice));
            given(bookmarkRepository.save(any(Bookmark.class)))
                    .willAnswer(invocation -> invocation.getArgument(0));

            JobNoticeDTO.ResponseBookmark response = userJobNoticeService.createBookmark(101L, memberId);

            assertThat(response.jobNoticeId()).isEqualTo(101L);
            assertThat(response.bookmarked()).isTrue();
            verify(bookmarkRepository).save(any(Bookmark.class));
        }

        @Test
        @DisplayName("중복 북마크 등록 시 BOOKMARK_ALREADY_EXISTS 예외")
        void createBookmark_duplicateThrows() {
            UUID memberId = UUID.randomUUID();
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );

            given(jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(101L, JobNoticeStatus.ACTIVE))
                    .willReturn(Optional.of(jobNotice));
            given(bookmarkRepository.save(any(Bookmark.class)))
                    .willThrow(new DataIntegrityViolationException("duplicate bookmark"));

            assertThatThrownBy(() -> userJobNoticeService.createBookmark(101L, memberId))
                    .isInstanceOf(CustomException.class)
                    .extracting(exception -> ((CustomException) exception).getErrorCode())
                    .isEqualTo(JobNoticeErrorCode.BOOKMARK_ALREADY_EXISTS);
        }

        @Test
        @DisplayName("비공개 또는 존재하지 않는 공고 북마크 등록 시 JOB_NOTICE_NOT_FOUND 예외")
        void createBookmark_notFoundThrows() {
            UUID memberId = UUID.randomUUID();

            given(jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(999L, JobNoticeStatus.ACTIVE))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> userJobNoticeService.createBookmark(999L, memberId))
                    .isInstanceOf(CustomException.class)
                    .extracting(exception -> ((CustomException) exception).getErrorCode())
                    .isEqualTo(JobNoticeErrorCode.JOB_NOTICE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("북마크 해제 - deleteBookmark()")
    class DeleteBookmark {

        @Test
        @DisplayName("북마크 해제 성공")
        void deleteBookmark_success() {
            UUID memberId = UUID.randomUUID();
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );
            Bookmark bookmark = Bookmark.of(memberId, jobNotice);

            given(jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(101L, JobNoticeStatus.ACTIVE))
                    .willReturn(Optional.of(jobNotice));
            given(bookmarkRepository.findByMemberIdAndJobNoticeId(memberId, 101L))
                    .willReturn(Optional.of(bookmark));

            JobNoticeDTO.ResponseBookmark response = userJobNoticeService.deleteBookmark(101L, memberId);

            assertThat(response.jobNoticeId()).isEqualTo(101L);
            assertThat(response.bookmarked()).isFalse();
            verify(bookmarkRepository).delete(bookmark);
        }

        @Test
        @DisplayName("존재하지 않는 북마크 해제 시 BOOKMARK_NOT_FOUND 예외")
        void deleteBookmark_notFoundThrows() {
            UUID memberId = UUID.randomUUID();
            JobNotice jobNotice = createJobNotice(
                    101L,
                    "CareerWave",
                    "백엔드 개발자",
                    new String[]{"Java", "Spring Boot"},
                    new String[]{"BACKEND"},
                    JobType.FULLTIME,
                    CompanySize.STARTUP,
                    CareerLevel.JUNIOR,
                    "Seoul",
                    "면접 후 협의",
                    "WANTED",
                    123,
                    LocalDate.of(2026, 6, 30),
                    ZonedDateTime.of(2026, 6, 1, 0, 0, 0, 0, SERVICE_ZONE_ID)
            );

            given(jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(101L, JobNoticeStatus.ACTIVE))
                    .willReturn(Optional.of(jobNotice));
            given(bookmarkRepository.findByMemberIdAndJobNoticeId(memberId, 101L))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> userJobNoticeService.deleteBookmark(101L, memberId))
                    .isInstanceOf(CustomException.class)
                    .extracting(exception -> ((CustomException) exception).getErrorCode())
                    .isEqualTo(JobNoticeErrorCode.BOOKMARK_NOT_FOUND);
        }

        @Test
        @DisplayName("비공개 또는 존재하지 않는 공고 북마크 해제 시 JOB_NOTICE_NOT_FOUND 예외")
        void deleteBookmark_jobNoticeNotFoundThrows() {
            UUID memberId = UUID.randomUUID();

            given(jobNoticeRepository.findByJobNoticeIdAndNoticeStatus(999L, JobNoticeStatus.ACTIVE))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> userJobNoticeService.deleteBookmark(999L, memberId))
                    .isInstanceOf(CustomException.class)
                    .extracting(exception -> ((CustomException) exception).getErrorCode())
                    .isEqualTo(JobNoticeErrorCode.JOB_NOTICE_NOT_FOUND);
        }
    }

    private JobNotice createJobNotice(
            Long jobNoticeId,
            String companyName,
            String title,
            String[] skillTags,
            String[] jobCategory,
            JobType jobType,
            CompanySize companySize,
            CareerLevel careerLevel,
            String location,
            String salary,
            String source,
            Integer viewCount,
            LocalDate deadline,
            ZonedDateTime createdAt
    ) {
        try {
            var constructor = JobNotice.class.getDeclaredConstructor();
            constructor.setAccessible(true);

            JobNotice jobNotice = constructor.newInstance();
            setField(jobNotice, "jobNoticeId", jobNoticeId);
            setField(jobNotice, "companyName", companyName);
            setField(jobNotice, "title", title);
            setField(jobNotice, "description", "Spring Boot 기반 백엔드 개발");
            setField(jobNotice, "skillTags", skillTags);
            setField(jobNotice, "jobType", jobType);
            setField(jobNotice, "companySize", companySize);
            setField(jobNotice, "jobCategory", jobCategory);
            setField(jobNotice, "careerLevel", careerLevel);
            setField(jobNotice, "location", location);
            setField(jobNotice, "salary", salary);
            setField(jobNotice, "noticeStatus", JobNoticeStatus.ACTIVE);
            setField(jobNotice, "originalUrl", "https://example.com/job/" + jobNoticeId);
            setField(jobNotice, "source", source);
            setField(jobNotice, "viewCount", viewCount);
            setField(jobNotice, "deadline", deadline);
            setField(jobNotice, "createdAt", createdAt);
            setField(jobNotice, "updatedAt", createdAt);
            return jobNotice;
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
