package kr.co.carrer.admin.admin.repository;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.entity.QAdmin;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class AdminQueryRepository {

    private static final QAdmin admin = QAdmin.admin;

    private final JPAQueryFactory queryFactory;

    public Page<Admin> findAdmins(String keyword, AdminRole role, AdminStatus status, Pageable pageable) {
        BooleanBuilder predicate = buildPredicate(keyword, role, status);

        List<Admin> result = queryFactory
                .selectFrom(admin)
                .where(predicate)
                .orderBy(admin.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = countAdmins(keyword, role, status);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAdmins(String keyword, AdminRole role, AdminStatus status) {
        Long count = queryFactory
                .select(admin.count())
                .from(admin)
                .where(buildPredicate(keyword, role, status))
                .fetchOne();

        return count != null ? count : 0L;
    }

    private BooleanBuilder buildPredicate(String keyword, AdminRole role, AdminStatus status) {
        BooleanBuilder predicate = new BooleanBuilder();

        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword = keyword.trim();
            predicate.and(
                    admin.email.containsIgnoreCase(normalizedKeyword)
                            .or(admin.name.containsIgnoreCase(normalizedKeyword))
            );
        }
        if (role != null) {
            predicate.and(admin.adminRole.eq(role));
        }
        if (status != null) {
            predicate.and(admin.status.eq(status));
        }

        return predicate;
    }
}
