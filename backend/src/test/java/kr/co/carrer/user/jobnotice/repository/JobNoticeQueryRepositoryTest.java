package kr.co.carrer.user.jobnotice.repository;

import kr.co.carrer.support.PostgreSqlTestContainerSupport;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(excludeAutoConfiguration = JpaRepositoriesAutoConfiguration.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(classes = JobNoticeQueryRepositoryTest.TestJpaConfig.class)
@TestPropertySource(properties = {
        "spring.sql.init.mode=never"
})
class JobNoticeQueryRepositoryTest extends PostgreSqlTestContainerSupport {

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = JpaRepositoriesAutoConfiguration.class)
    @EntityScan(basePackageClasses = JobNotice.class)
    static class TestJpaConfig {
    }

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private long originalUrlSequence = 1L;

    private JobNoticeQueryRepository jobNoticeQueryRepository;

    @Autowired
    private TestEntityManager testEntityManager;

    @BeforeEach
    void setUp() {
        jobNoticeQueryRepository = new JobNoticeQueryRepository(testEntityManager.getEntityManager());
    }

    @Test
    @DisplayName("filters active notices by dynamic scalar conditions")
    void findActiveJobNotices_filtersByDynamicConditions() {
        persistJobNotice(
                "CareerWave",
                "Backend Developer",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                JobNoticeStatus.ACTIVE,
                10,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                "CareerWave",
                "Backend Intern",
                JobType.INTERN,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                JobNoticeStatus.ACTIVE,
                5,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                "CareerWave",
                "Closed Backend Developer",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                JobNoticeStatus.CLOSED,
                12,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                "CareerWave",
                "Senior Backend Developer",
                JobType.FULLTIME,
                CompanySize.LARGE,
                CareerLevel.SENIOR,
                "\uBD80\uC0B0",
                JobNoticeStatus.ACTIVE,
                20,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );

        flushAndClear();

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                null,
                JobType.FULLTIME,
                null,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                CompanySize.STARTUP,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().getFirst().getTitle()).isEqualTo("Backend Developer");
        assertThat(result.getContent().getFirst().getCompanyName()).isEqualTo("CareerWave");
        assertThat(result.getContent().getFirst().getNoticeStatus()).isEqualTo(JobNoticeStatus.ACTIVE);
    }

    @Test
    @DisplayName("matches normalized representative location exactly")
    void findActiveJobNotices_filtersByExactNormalizedLocation() {
        persistJobNotice(
                "Seoul Co",
                "Seoul Backend Engineer",
                JobType.FULLTIME,
                CompanySize.SME,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                JobNoticeStatus.ACTIVE,
                1,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                "Legacy Co",
                "Legacy Location Notice",
                JobType.FULLTIME,
                CompanySize.SME,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8 \uAC15\uB0A8",
                JobNoticeStatus.ACTIVE,
                1,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );

        flushAndClear();

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                null,
                null,
                null,
                null,
                "\uC11C\uC6B8",
                null,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(result.getContent()).extracting(JobNotice::getTitle)
                .containsExactly("Seoul Backend Engineer");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("applies latest, views, and recommend sort contracts")
    void findActiveJobNotices_sortsByContract() {
        persistJobNotice(
                "CareerWave",
                "Notice A",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                JobNoticeStatus.ACTIVE,
                300,
                LocalDate.of(2026, 6, 27),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                "CareerWave",
                "Notice B",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                100,
                LocalDate.of(2026, 6, 20),
                ZonedDateTime.of(2026, 6, 12, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                "CareerWave",
                "Notice C",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                200,
                LocalDate.of(2026, 6, 18),
                ZonedDateTime.of(2026, 6, 11, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );

        flushAndClear();

        Page<JobNotice> latestResult = findAllSortedBy("latest");
        Page<JobNotice> viewsResult = findAllSortedBy("views");
        Page<JobNotice> recommendResult = findAllSortedBy("recommend");

        assertThat(latestResult.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Notice B", "Notice C", "Notice A");
        assertThat(viewsResult.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Notice A", "Notice C", "Notice B");
        assertThat(recommendResult.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Notice C", "Notice B", "Notice A");
    }

    @Test
    @DisplayName("matches keyword against skill_tags through search_text")
    void findActiveJobNotices_filtersKeywordBySkillTagsArray() {
        persistJobNotice(
                "Skill Co",
                "Platform Engineer",
                new String[]{"Kotlin", "Spring Boot", "PostgreSQL"},
                new String[]{"BACKEND"}
        );
        persistJobNotice(
                "Skill Co",
                "Frontend Engineer",
                new String[]{"React", "TypeScript"},
                new String[]{"FRONTEND"}
        );

        flushAndClear();

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                "postgre",
                null,
                null,
                null,
                null,
                null,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(result.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Platform Engineer");
    }

    @Test
    @DisplayName("matches keyword against job_category through search_text")
    void findActiveJobNotices_filtersKeywordByJobCategoryArray() {
        persistJobNotice(
                "Category Co",
                "Data Platform Engineer",
                new String[]{"Python", "Airflow"},
                new String[]{"DATA", "BACKEND"}
        );
        persistJobNotice(
                "Category Co",
                "Product Designer",
                new String[]{"Figma"},
                new String[]{"DESIGN"}
        );

        flushAndClear();

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                "data",
                null,
                null,
                null,
                null,
                null,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(result.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Data Platform Engineer");
    }

    @Test
    @DisplayName("filters job_category with PostgreSQL array_position")
    void findActiveJobNotices_filtersByJobCategoryArrayPosition() {
        persistJobNotice(
                "Category Co",
                "Backend Platform Engineer",
                new String[]{"Java"},
                new String[]{"BACKEND", "INFRA"}
        );
        persistJobNotice(
                "Category Co",
                "Mobile Engineer",
                new String[]{"Kotlin"},
                new String[]{"MOBILE"}
        );

        flushAndClear();

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                null,
                null,
                "INFRA",
                null,
                null,
                null,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(result.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Backend Platform Engineer");
    }

    @Test
    @DisplayName("filters period by today, 7d, and 30d contracts")
    void findActiveJobNotices_filtersByPeriodContract() {
        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);
        ZonedDateTime today = now.toLocalDate().atStartOfDay(SERVICE_ZONE_ID).plusMinutes(1);

        persistJobNotice(
                "Period Co",
                "Today Notice",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                10,
                now.toLocalDate().plusDays(10),
                today
        );
        persistJobNotice(
                "Period Co",
                "Seven Days Notice",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                20,
                now.toLocalDate().plusDays(10),
                now.minusDays(3)
        );
        persistJobNotice(
                "Period Co",
                "Thirty Days Notice",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                30,
                now.toLocalDate().plusDays(10),
                now.minusDays(20)
        );
        persistJobNotice(
                "Period Co",
                "Old Notice",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                40,
                now.toLocalDate().plusDays(10),
                now.minusDays(40)
        );

        flushAndClear();

        assertThat(findByPeriod("today").getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Today Notice");
        assertThat(findByPeriod("7d").getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Today Notice", "Seven Days Notice");
        assertThat(findByPeriod("30d").getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("Today Notice", "Seven Days Notice", "Thirty Days Notice");
    }

    @Test
    @DisplayName("returns active notice metadata for list stats and filter options")
    void findActiveJobNoticeMetadata_returnsOnlyActiveNotices() {
        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);
        persistJobNotice(
                "Meta Co",
                "Today Backend Notice",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "\uC11C\uC6B8",
                JobNoticeStatus.ACTIVE,
                10,
                now.toLocalDate().plusDays(10),
                now,
                new String[]{"Java"},
                new String[]{"BACKEND"}
        );
        persistJobNotice(
                "Meta Co",
                "Old Frontend Notice",
                JobType.CONTRACT,
                CompanySize.LARGE,
                CareerLevel.SENIOR,
                "\uBD80\uC0B0",
                JobNoticeStatus.ACTIVE,
                20,
                now.toLocalDate().plusDays(20),
                now.minusDays(2),
                new String[]{"React"},
                new String[]{"FRONTEND"}
        );
        persistJobNotice(
                "Meta Co",
                "Closed Data Notice",
                JobType.INTERN,
                CompanySize.SME,
                CareerLevel.ANY,
                "\uB300\uAD6C",
                JobNoticeStatus.CLOSED,
                30,
                now.toLocalDate().plusDays(30),
                now,
                new String[]{"Python"},
                new String[]{"DATA"}
        );
        persistJobNotice(
                "Meta Co",
                "Legacy Metadata Notice",
                JobType.FULLTIME,
                CompanySize.SME,
                CareerLevel.ANY,
                "\uC11C\uC6B8 \uAC15\uB0A8",
                JobNoticeStatus.ACTIVE,
                1,
                now.toLocalDate().plusDays(15),
                now.minusDays(3),
                new String[]{"Terraform"},
                new String[]{"INFRA"}
        );

        flushAndClear();

        assertThat(jobNoticeQueryRepository.countActiveJobNotices()).isEqualTo(3);
        assertThat(jobNoticeQueryRepository.countTodayNewActiveJobNotices()).isEqualTo(1);
        assertThat(jobNoticeQueryRepository.findDistinctActiveJobTypes())
                .containsExactly("CONTRACT", "FULLTIME");
        assertThat(jobNoticeQueryRepository.findDistinctActiveJobCategories())
                .containsExactly("BACKEND", "FRONTEND");
        assertThat(jobNoticeQueryRepository.findDistinctActiveCareerLevels())
                .containsExactly("ANY", "JUNIOR", "SENIOR");
        assertThat(jobNoticeQueryRepository.findDistinctActiveLocations())
                .containsExactly("\uBD80\uC0B0", "\uC11C\uC6B8");
        assertThat(jobNoticeQueryRepository.findDistinctActiveCompanySizes())
                .containsExactly("LARGE", "SME", "STARTUP");
    }

    @Test
    @DisplayName("reads FastAPI scraped job_notices rows through user active list and detail contracts")
    void fastApiScrapedJobNoticeRows_areReadByUserJobNoticeQueries() {
        ZonedDateTime createdAt = ZonedDateTime.of(2026, 6, 20, 10, 30, 0, 0, SERVICE_ZONE_ID);
        Long activeJobNoticeId = persistFastApiScrapedJobNotice(
                "wanted",
                "https://www.wanted.co.kr/wd/789",
                "FastAPI Scraped Backend Engineer",
                "ACTIVE",
                LocalDate.of(2026, 7, 31),
                createdAt
        );
        Long closedJobNoticeId = persistFastApiScrapedJobNotice(
                "saramin",
                "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=789",
                "FastAPI Scraped Closed Engineer",
                "CLOSED",
                LocalDate.of(2026, 6, 1),
                createdAt.plusMinutes(1)
        );

        flushAndClear();

        Page<JobNotice> listResult = jobNoticeQueryRepository.findActiveJobNotices(
                "FastAPI Scraped",
                null,
                null,
                null,
                null,
                null,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(listResult.getContent())
                .extracting(JobNotice::getJobNoticeId)
                .containsExactly(activeJobNoticeId);

        JobNotice activeNotice = listResult.getContent().getFirst();
        assertThat(activeNotice.getJobType()).isEqualTo(JobType.FULLTIME);
        assertThat(activeNotice.getCompanySize()).isEqualTo(CompanySize.SME);
        assertThat(activeNotice.getCareerLevel()).isEqualTo(CareerLevel.JUNIOR);
        assertThat(activeNotice.getNoticeStatus()).isEqualTo(JobNoticeStatus.ACTIVE);
        assertThat(activeNotice.getSource()).isEqualTo("wanted");
        assertThat(activeNotice.getSkillTags()).containsExactly("Python", "FastAPI");
        assertThat(activeNotice.getJobCategory()).containsExactly("BACKEND", "AI");

        assertThat(jobNoticeQueryRepository.findActiveJobNoticeById(activeJobNoticeId))
                .hasValueSatisfying(detail -> {
                    assertThat(detail.getOriginalUrl()).isEqualTo("https://www.wanted.co.kr/wd/789");
                    assertThat(detail.getTitle()).isEqualTo("FastAPI Scraped Backend Engineer");
                    assertThat(detail.getNoticeStatus()).isEqualTo(JobNoticeStatus.ACTIVE);
                });
        assertThat(jobNoticeQueryRepository.findActiveJobNoticeById(closedJobNoticeId)).isEmpty();
    }

    private Page<JobNotice> findAllSortedBy(String sort) {
        return jobNoticeQueryRepository.findActiveJobNotices(
                null, null, null, null, null, null, "all", sort, PageRequest.of(0, 20)
        );
    }

    private Page<JobNotice> findByPeriod(String period) {
        return jobNoticeQueryRepository.findActiveJobNotices(
                null, null, null, null, null, null, period, "latest", PageRequest.of(0, 20)
        );
    }

    private void persistJobNotice(
            String companyName,
            String title,
            String[] skillTags,
            String[] jobCategory
    ) {
        persistJobNotice(
                companyName,
                title,
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                10,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID),
                skillTags,
                jobCategory
        );
    }

    private void persistJobNotice(
            String companyName,
            String title,
            JobType jobType,
            CompanySize companySize,
            CareerLevel careerLevel,
            String location,
            JobNoticeStatus noticeStatus,
            Integer viewCount,
            LocalDate deadline,
            ZonedDateTime createdAt
    ) {
        persistJobNotice(
                companyName,
                title,
                jobType,
                companySize,
                careerLevel,
                location,
                noticeStatus,
                viewCount,
                deadline,
                createdAt,
                new String[]{"Java", "Spring Boot"},
                new String[]{"BACKEND"}
        );
    }

    private void persistJobNotice(
            String companyName,
            String title,
            JobType jobType,
            CompanySize companySize,
            CareerLevel careerLevel,
            String location,
            JobNoticeStatus noticeStatus,
            Integer viewCount,
            LocalDate deadline,
            ZonedDateTime createdAt,
            String[] skillTags,
            String[] jobCategory
    ) {
        try {
            var constructor = JobNotice.class.getDeclaredConstructor();
            constructor.setAccessible(true);

            JobNotice jobNotice = constructor.newInstance();
            setField(jobNotice, "companyName", companyName);
            setField(jobNotice, "title", title);
            setField(jobNotice, "description", title + " description");
            setField(jobNotice, "skillTags", skillTags);
            setField(jobNotice, "jobType", jobType);
            setField(jobNotice, "companySize", companySize);
            setField(jobNotice, "jobCategory", jobCategory);
            setField(jobNotice, "careerLevel", careerLevel);
            setField(jobNotice, "location", location);
            setField(jobNotice, "salary", "Negotiable");
            setField(jobNotice, "noticeStatus", noticeStatus);
            setField(jobNotice, "originalUrl", "https://example.com/job/" + originalUrlSequence++);
            setField(jobNotice, "source", "WANTED");
            setField(jobNotice, "viewCount", viewCount);
            setField(jobNotice, "deadline", deadline);
            setField(jobNotice, "createdAt", createdAt);
            setField(jobNotice, "updatedAt", createdAt);

            testEntityManager.persist(jobNotice);
            setField(jobNotice, "createdAt", createdAt);
            setField(jobNotice, "updatedAt", createdAt);
        } catch (Exception exception) {
            throw new RuntimeException(exception);
        }
    }

    private Long persistFastApiScrapedJobNotice(
            String source,
            String originalUrl,
            String title,
            String noticeStatus,
            LocalDate deadline,
            ZonedDateTime createdAt
    ) {
        Object result = testEntityManager.getEntityManager()
                .createNativeQuery("""
                        INSERT INTO job_notices (
                            company_name,
                            title,
                            description,
                            search_text,
                            skill_tags,
                            job_type,
                            company_size,
                            job_category,
                            career_level,
                            location,
                            salary,
                            notice_status,
                            original_url,
                            source,
                            view_count,
                            deadline,
                            created_at,
                            updated_at
                        )
                        VALUES (
                            :companyName,
                            :title,
                            :description,
                            :searchText,
                            ARRAY['Python', 'FastAPI'],
                            'FULLTIME',
                            'SME',
                            ARRAY['BACKEND', 'AI'],
                            'JUNIOR',
                            :location,
                            :salary,
                            :noticeStatus,
                            :originalUrl,
                            :source,
                            0,
                            :deadline,
                            :createdAt,
                            :createdAt
                        )
                        RETURNING job_notice_id
                        """)
                .setParameter("companyName", "Scraped Company")
                .setParameter("title", title)
                .setParameter("description", title + " description")
                .setParameter("searchText", "Scraped Company " + title + " " + title + " description wanted Python FastAPI BACKEND AI")
                .setParameter("location", "Seoul")
                .setParameter("salary", "Negotiable")
                .setParameter("noticeStatus", noticeStatus)
                .setParameter("originalUrl", originalUrl)
                .setParameter("source", source)
                .setParameter("deadline", deadline)
                .setParameter("createdAt", createdAt)
                .getSingleResult();

        return ((Number) result).longValue();
    }

    private void flushAndClear() {
        testEntityManager.flush();
        testEntityManager.clear();
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
