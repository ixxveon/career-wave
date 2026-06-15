package kr.co.carrer.user.dashboard.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.jobnotice.entity.QBookmark;
import kr.co.carrer.user.jobnotice.entity.QJobNotice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class DashboardBookmarkQueryRepository {

    private static final QBookmark bookmark = QBookmark.bookmark;
    private static final QJobNotice jobNotice = QJobNotice.jobNotice;

    private final JPAQueryFactory queryFactory;

    public DashboardBookmarkQueryRepository(EntityManager entityManager) {
        this.queryFactory = new JPAQueryFactory(entityManager);
    }

    public Page<DashboardDTO.BookmarkResponse> findBookmarks(
            UUID memberId,
            String keyword,
            int page,
            int size
    ) {
        int normalizedPage = Math.max(page, 1) - 1;
        int normalizedSize = Math.max(size, 1);

        BooleanBuilder predicate = new BooleanBuilder();
        predicate.and(bookmark.memberId.eq(memberId));

        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword = keyword.trim();
            predicate.and(
                    jobNotice.companyName.containsIgnoreCase(normalizedKeyword)
                            .or(jobNotice.title.containsIgnoreCase(normalizedKeyword))
            );
        }

        List<DashboardDTO.BookmarkResponse> content = queryFactory
                .select(com.querydsl.core.types.Projections.constructor(
                        DashboardDTO.BookmarkResponse.class,
                        bookmark.bookmarkId,
                        jobNotice.jobNoticeId,
                        jobNotice.companyName,
                        jobNotice.title,
                        jobNotice.location,
                        jobNotice.careerLevel.stringValue(),
                        jobNotice.noticeStatus.stringValue(),
                        jobNotice.source,
                        jobNotice.deadline,
                        bookmark.createdAt
                ))
                .from(bookmark)
                .join(jobNotice).on(bookmark.jobNoticeId.eq(jobNotice.jobNoticeId))
                .where(predicate)
                .orderBy(bookmark.createdAt.desc())
                .offset((long) normalizedPage * normalizedSize)
                .limit(normalizedSize)
                .fetch();

        Long total = queryFactory
                .select(bookmark.count())
                .from(bookmark)
                .join(jobNotice).on(bookmark.jobNoticeId.eq(jobNotice.jobNoticeId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(
                content,
                PageRequest.of(normalizedPage, normalizedSize),
                total != null ? total : 0L
        );
    }
}