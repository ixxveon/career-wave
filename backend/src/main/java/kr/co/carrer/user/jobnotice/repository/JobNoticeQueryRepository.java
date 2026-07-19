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
    // FastAPI JobNoticeNormalizer가 DB에 저장하는 카테고리/지역 표준값과 반드시 함께 변경한다.
    private static final List<String> STANDARD_JOB_CATEGORIES = List.of(
            "BACKEND", "FRONTEND", "DATA", "DEVOPS", "MOBILE", "SECURITY", "QA", "GAME", "EMBEDDED"
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
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            String period,
            String sort,
            Pageable pageable
    ) {
        Pageable normalizedPageable = normalizePageable(pageable);
        List<JobNotice> content = findActiveJobNoticeContent(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes, period, sort, normalizedPageable
        );
        long total = countActiveJobNotices(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes, period
        );

        return new PageImpl<>(content, normalizedPageable, total);
    }

    public List<JobNotice> findActiveJobNoticeContent(
            String keyword,
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            String period,
            String sort,
            Pageable pageable
    ) {
        return findActiveJobNoticeContent(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes,
                null, null, null, period, sort, pageable
        );
    }

    public List<JobNotice> findActiveJobNoticeContent(
            String keyword,
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            List<String> careerRanges,
            List<String> deadlineTypes,
            List<String> sources,
            String period,
            String sort,
            Pageable pageable
    ) {
        Pageable normalizedPageable = normalizePageable(pageable);
        BooleanBuilder predicate = buildActiveJobNoticePredicate(
                keyword,
                jobTypes,
                jobCategories,
                careerLevels,
                locations,
                companySizes,
                careerRanges,
                deadlineTypes,
                sources,
                period
        );

        OrderSpecifier<?>[] orderSpecifiers = resolveOrderSpecifiers(sort);

        // deep pagination 최적화 (deferred join / 지연 취행)
        // 1) 페이지 ID만 먼저 조회 — 무필터 ACTIVE 정렬은 커버링 인덱스(idx_jn_active_keyset)로
        //    Index Only Scan 되어, OFFSET으로 건너뛰는 앞 행 전체(width~872B)를 힙에서 끌어오지 않는다.
        //    (기존 selectFrom(...).offset()은 앞 N행 전체를 정렬·폐기해 100만 기준 OFFSET 50만에서 ~84s 소요)
        List<Long> pageIds = queryFactory
                .select(jobNotice.jobNoticeId)
                .from(jobNotice)
                .where(predicate)
                .orderBy(orderSpecifiers)
                .offset(normalizedPageable.getOffset())
                .limit(normalizedPageable.getPageSize())
                .fetch();
        if (pageIds.isEmpty()) {
            return List.of();
        }

        // 2) 해당 페이지의 전체 행만 조회 후 동일 정렬 (페이지 크기만큼이라 재정렬 비용 무시 가능)
        //    predicate를 다시 적용한다: 기본 READ_COMMITTED 격리 수준에서는 1)·2) 쿼리 사이에
        //    공고 상태(ACTIVE→CLOSED)나 필터 대상 값이 바뀔 수 있어, ID 조건만 쓰면 이미 필터를
        //    벗어난 공고가 응답에 섞일 수 있다. 페이지 크기만 조회하므로 성능 영향은 무시 가능.
        return queryFactory
                .selectFrom(jobNotice)
                .where(predicate, jobNotice.jobNoticeId.in(pageIds))
                .orderBy(orderSpecifiers)
                .fetch();
    }

    public long countActiveJobNotices(
            String keyword,
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            String period
    ) {
        return countActiveJobNotices(
                keyword, jobTypes, jobCategories, careerLevels, locations, companySizes,
                null, null, null, period
        );
    }

    public long countActiveJobNotices(
            String keyword,
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            List<String> careerRanges,
            List<String> deadlineTypes,
            List<String> sources,
            String period
    ) {
        BooleanBuilder predicate = buildActiveJobNoticePredicate(
                keyword,
                jobTypes,
                jobCategories,
                careerLevels,
                locations,
                companySizes,
                careerRanges,
                deadlineTypes,
                sources,
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
        int normalizedPage = Math.max(page, 1) - 1;
        int normalizedSize = Math.max(size, 1);
        return findActiveJobNotices(
                keyword,
                jobTypes,
                jobCategories,
                careerLevels,
                locations,
                companySizes,
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
            List<JobType> jobTypes,
            List<String> jobCategories,
            List<CareerLevel> careerLevels,
            List<String> locations,
            List<CompanySize> companySizes,
            List<String> careerRanges,
            List<String> deadlineTypes,
            List<String> sources,
            String period
    ) {
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(jobNotice.noticeStatus.eq(JobNoticeStatus.ACTIVE));

        Predicate keywordCondition = keywordCondition(keyword);
        if (keywordCondition != null) {
            builder.and(keywordCondition);
        }

        if (jobTypes != null && !jobTypes.isEmpty()) {
            builder.and(jobNotice.jobType.in(jobTypes));
        }
        if (jobCategories != null && !jobCategories.isEmpty()) {
            BooleanBuilder categoryPredicate = new BooleanBuilder();
            jobCategories.stream().filter(category -> category != null && !category.isBlank())
                    .forEach(category -> categoryPredicate.or(arrayContains(jobNotice.jobCategory, category.trim())));
            if (categoryPredicate.hasValue()) builder.and(categoryPredicate);
        }
        if (careerLevels != null && !careerLevels.isEmpty()) {
            builder.and(jobNotice.careerLevel.in(careerLevels));
        }
        List<String> normalizedLocations = locations == null
                ? List.of()
                : locations.stream()
                        .filter(value -> value != null && !value.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();
        if (!normalizedLocations.isEmpty()) {
            builder.and(jobNotice.location.in(normalizedLocations));
        }
        if (companySizes != null && !companySizes.isEmpty()) {
            builder.and(jobNotice.companySize.in(companySizes));
        }

        Predicate careerRangeCondition = careerRangeCondition(careerRanges);
        if (careerRangeCondition != null) {
            builder.and(careerRangeCondition);
        }

        Predicate deadlineTypeCondition = deadlineTypeCondition(deadlineTypes);
        if (deadlineTypeCondition != null) {
            builder.and(deadlineTypeCondition);
        }

        List<String> normalizedSources = normalizeUpperCaseValues(sources);
        if (!normalizedSources.isEmpty()) {
            builder.and(jobNotice.source.upper().in(normalizedSources));
        }

        BooleanExpression periodCondition = periodCondition(period);
        if (periodCondition != null) {
            builder.and(periodCondition);
        }

        return builder;
    }

    private Predicate careerRangeCondition(List<String> careerRanges) {
        List<String> normalizedRanges = normalizeUpperCaseValues(careerRanges);
        if (normalizedRanges.isEmpty()) {
            return null;
        }

        BooleanBuilder condition = new BooleanBuilder();
        for (String careerRange : normalizedRanges) {
            BooleanExpression exactCode = jobNotice.careerLevel.stringValue().eq(careerRange);
            switch (careerRange) {
                case "FRESHER", "ANY_EXPERIENCE", "INTERN" -> condition.or(exactCode);
                case "UNDER_1" -> condition.or(exactCode.or(
                        jobNotice.careerMinYears.isNotNull()
                                .and(jobNotice.careerMinYears.loe(1))
                                .and(jobNotice.careerMaxYears.isNull().or(jobNotice.careerMaxYears.goe(0)))
                ));
                case "OVER_1", "OVER_2", "OVER_3", "OVER_5", "OVER_7", "OVER_10" -> {
                    int minimumYears = Integer.parseInt(careerRange.substring("OVER_".length()));
                    condition.or(exactCode.or(
                            jobNotice.careerMinYears.isNotNull().and(
                                    jobNotice.careerMaxYears.isNull().or(jobNotice.careerMaxYears.goe(minimumYears))
                            )
                    ));
                }
                default -> {
                    // Unknown codes are ignored so invalid query values do not widen the result set.
                }
            }
        }
        return condition.hasValue() ? condition : null;
    }

    private Predicate deadlineTypeCondition(List<String> deadlineTypes) {
        List<String> normalizedTypes = normalizeUpperCaseValues(deadlineTypes);
        if (normalizedTypes.isEmpty()) {
            return null;
        }

        LocalDate today = ZonedDateTime.now(SERVICE_ZONE_ID).toLocalDate();
        BooleanBuilder condition = new BooleanBuilder();
        for (String deadlineType : normalizedTypes) {
            switch (deadlineType) {
                case "TODAY" -> condition.or(jobNotice.deadline.eq(today));
                case "WITHIN_7_DAYS" -> condition.or(jobNotice.deadline.between(today, today.plusDays(7)));
                case "OPEN_ENDED" -> condition.or(jobNotice.deadline.isNull());
                default -> {
                    // Unknown codes are ignored so invalid query values do not widen the result set.
                }
            }
        }
        return condition.hasValue() ? condition : null;
    }

    private List<String> normalizeUpperCaseValues(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toUpperCase())
                .distinct()
                .toList();
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

        // 모든 정렬에 jobNoticeId ASC를 마지막 tie-breaker로 추가한다.
        // - 페이지네이션 결정성 확보: 정렬 키가 동률인 행의 순서가 페이지마다 흔들려
        //   중복/누락되는 문제를 막는다.
        // - recommend 정렬은 (deadline ASC NULLS LAST, created_at DESC, job_notice_id)
        //   커버링 인덱스(idx_jn_active_keyset) 순서와 정확히 일치해 Index Only Scan을 유지한다.
        orderSpecifiers.add(jobNotice.jobNoticeId.asc());

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
