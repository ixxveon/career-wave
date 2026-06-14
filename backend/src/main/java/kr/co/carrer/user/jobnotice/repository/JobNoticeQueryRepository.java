package kr.co.carrer.user.jobnotice.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Predicate;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import kr.co.carrer.user.jobnotice.entity.JobNotice;
import kr.co.carrer.user.jobnotice.entity.QJobNotice;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class JobNoticeQueryRepository {

    private static final QJobNotice jobNotice = QJobNotice.jobNotice;
    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final JPAQueryFactory queryFactory;

    public JobNoticeQueryRepository(EntityManager entityManager) {
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
        BooleanBuilder predicate = buildActiveJobNoticePredicate(
                keyword,
                jobType,
                jobCategory,
                careerLevel,
                location,
                companySize,
                period
        );

        List<JobNotice> content = queryFactory
                .selectFrom(jobNotice)
                .where(predicate)
                .orderBy(resolveOrderSpecifiers(sort))
                .offset(normalizedPageable.getOffset())
                .limit(normalizedPageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(jobNotice.count())
                .from(jobNotice)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(content, normalizedPageable, total != null ? total : 0L);
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
            builder.and(jobNotice.location.containsIgnoreCase(location.trim()));
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

        BooleanBuilder keywordBuilder = new BooleanBuilder();
        keywordBuilder.or(jobNotice.title.containsIgnoreCase(normalizedKeyword));
        keywordBuilder.or(jobNotice.description.containsIgnoreCase(normalizedKeyword));
        keywordBuilder.or(jobNotice.companyName.containsIgnoreCase(normalizedKeyword));
        keywordBuilder.or(jobNotice.source.containsIgnoreCase(normalizedKeyword));
        keywordBuilder.or(arrayContainsIgnoreCase(jobNotice.skillTags, normalizedKeyword));
        keywordBuilder.or(arrayContainsIgnoreCase(jobNotice.jobCategory, normalizedKeyword));
        return keywordBuilder.getValue();
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

    private BooleanExpression arrayContainsIgnoreCase(com.querydsl.core.types.dsl.ArrayPath<String[], String> arrayPath, String value) {
        return Expressions.booleanTemplate(
                "exists (select 1 from unnest({0}) as element where lower(element) like lower({1}))",
                arrayPath,
                "%" + value + "%"
        );
    }

    private BooleanExpression arrayContains(com.querydsl.core.types.dsl.ArrayPath<String[], String> arrayPath, String value) {
        return Expressions.booleanTemplate(
                "array_position({0}, {1}) is not null",
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
