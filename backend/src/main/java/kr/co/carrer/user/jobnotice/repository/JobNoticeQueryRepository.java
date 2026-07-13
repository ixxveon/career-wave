package kr.co.carrer.user.jobnotice.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Predicate;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.entity.QJobNotice;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public class JobNoticeQueryRepository {

    private static final QJobNotice jobNotice = QJobNotice.jobNotice;
    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");
    private static final List<String> STANDARD_JOB_CATEGORIES = List.of(
            "BACKEND", "FRONTEND", "DATA", "DEVOPS"
    );
    private static final List<String> STANDARD_LOCATIONS = List.of(
            "\uC11C\uC6B8", "\uACBD\uAE30", "\uC778\uCC9C", "\uBD80\uC0B0", "\uB300\uAD6C", "\uAD11\uC8FC", "\uB300\uC804", "\uC6B8\uC0B0", "\uC138\uC885",
            "\uAC15\uC6D0", "\uCD09\uBD81", "\uCD09\uB0A8", "\uC804\uBD81", "\uC804\uB0A8", "\uACBD\uBD81", "\uACBD\uB0A8", "\uC81C\uC8FC"
    );

    private final EntityManager entityManager;
    private final JPAQueryFactory queryFactory;

    public JobNoticeQueryRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
        this.queryFactory = new JPAQueryFactory(entityManager);
    }

    public Page<JobNotice> findActiveJobNotices(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period,
            String sort,
            Pageable pageable
    ) {
        Pageable normalizedPageable = normalizePageable(pageable);
        List<JobNotice> content = findActiveJobNoticeContent(
                keyword, jobType, jobCategory, careerLevel, location, companySize, period, sort, normalizedPageable
        );
        long total = countActiveJobNotices(
                keyword, jobType, jobCategory, careerLevel, location, companySize, period
        );

        return new PageImpl<>(content, normalizedPageable, total);
    }

    public List<JobNotice> findActiveJobNoticeContent(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period,
            String sort,
            Pageable pageable
    ) {
        Pageable normalizedPageable = normalizePageable(pageable);
        BooleanBuilder predicate = buildActiveJobNoticePredicate(
                keyword,
                jobType,
                jobCategory,
                careerLevel,
                location,
                companySize,
                period
        );

        return queryFactory
                .selectFrom(jobNotice)
                .where(predicate)
                .orderBy(resolveOrderSpecifiers(sort))
                .offset(normalizedPageable.getOffset())
                .limit(normalizedPageable.getPageSize())
                .fetch();
    }

    public long countActiveJobNotices(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period
    ) {
        BooleanBuilder predicate = buildActiveJobNoticePredicate(
                keyword,
                jobType,
                jobCategory,
                careerLevel,
                location,
                companySize,
                period
        );

        Long total = queryFactory
                .select(jobNotice.count())
                .from(jobNotice)
                .where(predicate)
                .fetchOne();

        return total != null ? total : 0L;
    }

    public Page<JobNotice> findActiveJobNotices(
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
        int normalizedPage = Math.max(page, 1) - 1;
        int normalizedSize = Math.max(size, 1);
        return findActiveJobNotices(
                keyword,
                jobType,
                jobCategory,
                careerLevel,
                location,
                companySize,
                period,
                sort,
                PageRequest.of(normalizedPage, normalizedSize)
        );
    }

    public Optional<JobNotice> findActiveJobNoticeById(Long jobNoticeId) {
        JobNotice result = queryFactory
                .selectFrom(jobNotice)
                .where(
                        jobNotice.jobNoticeId.eq(jobNoticeId),
                        jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE)
                )
                .fetchOne();

        return Optional.ofNullable(result);
    }

    public long countActiveJobNotices() {
        Long count = queryFactory
                .select(jobNotice.count())
                .from(jobNotice)
                .where(jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE))
                .fetchOne();

        return count != null ? count : 0L;
    }

    public long countTodayNewActiveJobNotices() {
        ZonedDateTime startOfToday = ZonedDateTime.now(SERVICE_ZONE_ID)
                .toLocalDate()
                .atStartOfDay(SERVICE_ZONE_ID);
        ZonedDateTime startOfTomorrow = startOfToday.plusDays(1);

        Long count = queryFactory
                .select(jobNotice.count())
                .from(jobNotice)
                .where(
                        jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE),
                        jobNotice.createdAt.goe(startOfToday),
                        jobNotice.createdAt.lt(startOfTomorrow)
                )
                .fetchOne();

        return count != null ? count : 0L;
    }

    public List<String> findDistinctActiveJobTypes() {
        return queryFactory
                .select(jobNotice.jobType)
                .distinct()
                .from(jobNotice)
                .where(jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE))
                .fetch()
                .stream()
                .filter(Objects::nonNull)
                .map(JobType::name)
                .sorted()
                .toList();
    }

    public List<String> findDistinctActiveJobCategories() {
        List<?> categories = entityManager.createNativeQuery("""
                        SELECT DISTINCT btrim(category)
                        FROM job_notices j
                        CROSS JOIN LATERAL unnest(j.job_category) AS category
                        WHERE j.notice_status = 'ACTIVE'
                          AND category IS NOT NULL
                          AND btrim(category) <> ''
                        ORDER BY btrim(category)
                        """)
                .getResultList();

        return categories.stream()
                .map(String.class::cast)
                .filter(STANDARD_JOB_CATEGORIES::contains)
                .toList();
    }

    public List<String> findDistinctActiveCareerLevels() {
        return queryFactory
                .select(jobNotice.careerLevel)
                .distinct()
                .from(jobNotice)
                .where(jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE))
                .fetch()
                .stream()
                .filter(Objects::nonNull)
                .map(CareerLevel::name)
                .sorted()
                .toList();
    }

    public List<String> findDistinctActiveLocations() {
        return queryFactory
                .select(jobNotice.location)
                .distinct()
                .from(jobNotice)
                .where(
                        jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE),
                        jobNotice.location.isNotNull(),
                        jobNotice.location.isNotEmpty()
                )
                .fetch()
                .stream()
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .filter(STANDARD_LOCATIONS::contains)
                .distinct()
                .sorted()
                .toList();
    }

    public List<String> findDistinctActiveCompanySizes() {
        return queryFactory
                .select(jobNotice.companySize)
                .distinct()
                .from(jobNotice)
                .where(jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE))
                .fetch()
                .stream()
                .filter(Objects::nonNull)
                .map(CompanySize::name)
                .sorted()
                .toList();
    }

    private BooleanBuilder buildActiveJobNoticePredicate(
            String keyword,
            JobType jobType,
            String jobCategory,
            CareerLevel careerLevel,
            String location,
            CompanySize companySize,
            String period
    ) {
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE));

        Predicate keywordCondition = keywordCondition(keyword);
        if (keywordCondition != null) {
            builder.and(keywordCondition);
        }

        if (jobType != null) {
            builder.and(jobNotice.jobType.eq(jobType));
        }
        if (jobCategory != null && !jobCategory.isBlank()) {
            builder.and(arrayContains(jobNotice.jobCategory, jobCategory.trim()));
        }
        if (careerLevel != null) {
            builder.and(jobNotice.careerLevel.eq(careerLevel));
        }
        if (location != null && !location.isBlank()) {
            builder.and(jobNotice.location.equalsIgnoreCase(location.trim()));
        }
        if (companySize != null) {
            builder.and(jobNotice.companySize.eq(companySize));
        }

        BooleanExpression periodCondition = periodCondition(period);
        if (periodCondition != null) {
            builder.and(periodCondition);
        }

        return builder;
    }

    private Predicate keywordCondition(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }

        String normalizedKeyword = keyword.trim();
        return jobNotice.searchText.containsIgnoreCase(normalizedKeyword);
    }

    private BooleanExpression periodCondition(String period) {
        if (period == null || period.isBlank() || "all".equalsIgnoreCase(period.trim())) {
            return null;
        }

        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);
        ZonedDateTime from;
        ZonedDateTime to = now;
        LocalDate deadlineFrom;
        LocalDate deadlineTo = now.toLocalDate();

        switch (period.trim().toLowerCase()) {
            case "today" -> {
                from = now.toLocalDate().atStartOfDay(SERVICE_ZONE_ID);
                deadlineFrom = now.toLocalDate();
            }
            case "7d" -> {
                from = now.minusDays(7);
                deadlineFrom = now.toLocalDate().minusDays(7);
            }
            case "30d" -> {
                from = now.minusDays(30);
                deadlineFrom = now.toLocalDate().minusDays(30);
            }
            default -> {
                return null;
            }
        }

        return jobNotice.createdAt.between(from, to)
                .or(jobNotice.deadline.between(deadlineFrom, deadlineTo));
    }

    private OrderSpecifier<?>[] resolveOrderSpecifiers(String sort) {
        List<OrderSpecifier<?>> orderSpecifiers = new ArrayList<>();
        String normalizedSort = sort == null || sort.isBlank() ? "recommend" : sort.trim().toLowerCase();

        switch (normalizedSort) {
            case "latest" -> orderSpecifiers.add(jobNotice.createdAt.desc());
            case "views" -> {
                orderSpecifiers.add(jobNotice.viewCount.desc());
                orderSpecifiers.add(jobNotice.createdAt.desc());
            }
            case "recommend" -> {
                orderSpecifiers.add(jobNotice.deadline.asc().nullsLast());
                orderSpecifiers.add(jobNotice.createdAt.desc());
            }
            default -> {
                orderSpecifiers.add(jobNotice.deadline.asc().nullsLast());
                orderSpecifiers.add(jobNotice.createdAt.desc());
            }
        }

        return orderSpecifiers.toArray(new OrderSpecifier[0]);
    }

    private BooleanExpression arrayContains(com.querydsl.core.types.dsl.ArrayPath<String[], String> arrayPath, String value) {
        return Expressions.booleanTemplate(
                "concat(',', function('array_to_string', {0}, ','), ',') like concat('%,', {1}, ',%')",
                arrayPath,
                value
        );
    }

    private Pageable normalizePageable(Pageable pageable) {
        if (pageable == null) {
            return PageRequest.of(0, 20);
        }
        return PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                Math.max(pageable.getPageSize(), 1),
                pageable.getSort()
        );
    }
}
