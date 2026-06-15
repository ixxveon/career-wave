package kr.co.carrer.admin.admin.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.admin.entity.IpAcl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class IpAclQueryRepository {

    @PersistenceContext
    private EntityManager em;

    public Page<IpAcl> findIpAcls(Pageable pageable) {
        String sql = """
            SELECT ia.*
            FROM ip_acl ia
            ORDER BY ia.created_at DESC
            LIMIT ?1 OFFSET ?2
            """;

        Query query = em.createNativeQuery(sql, IpAcl.class);
        query.setParameter(1, pageable.getPageSize());
        query.setParameter(2, pageable.getOffset());

        @SuppressWarnings("unchecked")
        List<IpAcl> result = query.getResultList();

        long total = countIpAcls();
        return new PageImpl<>(result, pageable, total);
    }

    public long countIpAcls() {
        Query query = em.createNativeQuery("SELECT COUNT(*) FROM ip_acl");
        return ((Number) query.getSingleResult()).longValue();
    }
}
