package kr.co.carrer.admin.admin.repository;

import com.querydsl.jpa.impl.JPAQueryFactory;
import kr.co.carrer.admin.admin.entity.IpAcl;
import kr.co.carrer.admin.admin.entity.QIpAcl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class IpAclQueryRepository {

    private static final QIpAcl ipAcl = QIpAcl.ipAcl;

    private final JPAQueryFactory queryFactory;

    public Page<IpAcl> findIpAcls(Pageable pageable) {
        List<IpAcl> result = queryFactory
                .selectFrom(ipAcl)
                .orderBy(ipAcl.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = countIpAcls();
        return new PageImpl<>(result, pageable, total);
    }

    public long countIpAcls() {
        Long count = queryFactory
                .select(ipAcl.count())
                .from(ipAcl)
                .fetchOne();

        return count != null ? count : 0L;
    }
}
