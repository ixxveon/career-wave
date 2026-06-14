package kr.co.carrer.user.jobnotice.repository;

import jakarta.persistence.EntityManager;
import kr.co.carrer.support.PostgreSqlTestContainerSupport;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JobNoticeQueryRepository.class)
@TestPropertySource(properties = "spring.sql.init.mode=never")
class JobNoticeQueryRepositoryTest extends PostgreSqlTestContainerSupport {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Autowired
    private JobNoticeQueryRepository jobNoticeQueryRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("동적 검색 조건과 ACTIVE 상태 필터를 적용해 공개 공고만 조회한다")
    void findActiveJobNotices_filtersByDynamicConditions() {
        persistJobNotice(
                101L,
                "CareerWave",
                "백엔드 개발자",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul Gangnam",
                JobNoticeStatus.ACTIVE,
                10,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                102L,
                "CareerWave",
                "백엔드 인턴",
                JobType.INTERN,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul Gangnam",
                JobNoticeStatus.ACTIVE,
                5,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                103L,
                "CareerWave",
                "백엔드 개발자",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul Gangnam",
                JobNoticeStatus.CLOSED,
                12,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                104L,
                "CareerWave",
                "백엔드 개발자",
                JobType.FULLTIME,
                CompanySize.LARGE,
                CareerLevel.SENIOR,
                "Busan",
                JobNoticeStatus.ACTIVE,
                20,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );

        entityManager.flush();
        entityManager.clear();

        Page<JobNotice> result = jobNoticeQueryRepository.findActiveJobNotices(
                null,
                JobType.FULLTIME,
                null,
                CareerLevel.JUNIOR,
                "Gangnam",
                CompanySize.STARTUP,
                "all",
                "latest",
                PageRequest.of(0, 20)
        );

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().getFirst().getTitle()).isEqualTo("백엔드 개발자");
        assertThat(result.getContent().getFirst().getCompanyName()).isEqualTo("CareerWave");
        assertThat(result.getContent().getFirst().getNoticeStatus()).isEqualTo(JobNoticeStatus.ACTIVE);
    }

    @Test
    @DisplayName("정렬 조건 latest, views, recommend를 계약대로 적용한다")
    void findActiveJobNotices_sortsByContract() {
        persistJobNotice(
                201L,
                "CareerWave",
                "공고 A",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                10,
                LocalDate.of(2026, 6, 25),
                ZonedDateTime.of(2026, 6, 10, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                202L,
                "CareerWave",
                "공고 B",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                200,
                LocalDate.of(2026, 6, 20),
                ZonedDateTime.of(2026, 6, 12, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );
        persistJobNotice(
                203L,
                "CareerWave",
                "공고 C",
                JobType.FULLTIME,
                CompanySize.STARTUP,
                CareerLevel.JUNIOR,
                "Seoul",
                JobNoticeStatus.ACTIVE,
                100,
                LocalDate.of(2026, 6, 20),
                ZonedDateTime.of(2026, 6, 11, 0, 0, 0, 0, SERVICE_ZONE_ID)
        );

        entityManager.flush();
        entityManager.clear();

        Page<JobNotice> latestResult = jobNoticeQueryRepository.findActiveJobNotices(
                null, null, null, null, null, null, "all", "latest", PageRequest.of(0, 20)
        );
        Page<JobNotice> viewsResult = jobNoticeQueryRepository.findActiveJobNotices(
                null, null, null, null, null, null, "all", "views", PageRequest.of(0, 20)
        );
        Page<JobNotice> recommendResult = jobNoticeQueryRepository.findActiveJobNotices(
                null, null, null, null, null, null, "all", "recommend", PageRequest.of(0, 20)
        );

        assertThat(latestResult.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("공고 B", "공고 C", "공고 A");

        assertThat(viewsResult.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("공고 B", "공고 C", "공고 A");

        assertThat(recommendResult.getContent())
                .extracting(JobNotice::getTitle)
                .containsExactly("공고 B", "공고 C", "공고 A");
    }

    private void persistJobNotice(
            Long jobNoticeId,
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
        try {
            var constructor = JobNotice.class.getDeclaredConstructor();
            constructor.setAccessible(true);

            JobNotice jobNotice = constructor.newInstance();
            setField(jobNotice, "companyName", companyName);
            setField(jobNotice, "title", title);
            setField(jobNotice, "description", title + " 설명");
            setField(jobNotice, "skillTags", new String[]{"Java", "Spring Boot"});
            setField(jobNotice, "jobType", jobType);
            setField(jobNotice, "companySize", companySize);
            setField(jobNotice, "jobCategory", new String[]{"BACKEND"});
            setField(jobNotice, "careerLevel", careerLevel);
            setField(jobNotice, "location", location);
            setField(jobNotice, "salary", "면접 후 협의");
            setField(jobNotice, "noticeStatus", noticeStatus);
            setField(jobNotice, "originalUrl", "https://example.com/job/" + jobNoticeId);
            setField(jobNotice, "source", "WANTED");
            setField(jobNotice, "viewCount", viewCount);
            setField(jobNotice, "deadline", deadline);
            setField(jobNotice, "createdAt", createdAt);
            setField(jobNotice, "updatedAt", createdAt);

            entityManager.persist(jobNotice);
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
