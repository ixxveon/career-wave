package kr.co.carrer.admin.admin.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.type.AdminRole;
import kr.co.carrer.admin.admin.type.AdminStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

@Repository
public class AdminQueryRepository {

    @PersistenceContext
    private EntityManager em;

    public Page<Admin> findAdmins(String keyword, AdminRole role, AdminStatus status, Pageable pageable) {
        StringBuilder sql = new StringBuilder("""
            SELECT a.*
            FROM admins a
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (a.email ILIKE ?").append(idx)
               .append(" OR a.name ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
        }
        if (role != null) {
            sql.append(" AND a.admin_role = ?").append(idx);
            params.add(role.name());
            idx++;
        }
        if (status != null) {
            sql.append(" AND a.status = ?").append(idx);
            params.add(status.name());
            idx++;
        }

        sql.append(" ORDER BY a.created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(pageable.getPageSize());
        params.add(pageable.getOffset());

        Query query = em.createNativeQuery(sql.toString(), Admin.class);
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }

        @SuppressWarnings("unchecked")
        List<Admin> result = query.getResultList();
        long total = countAdmins(keyword, role, status);
        return new PageImpl<>(result, pageable, total);
    }

    public long countAdmins(String keyword, AdminRole role, AdminStatus status) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM admins a
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (a.email ILIKE ?").append(idx)
               .append(" OR a.name ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
        }
        if (role != null) {
            sql.append(" AND a.admin_role = ?").append(idx);
            params.add(role.name());
            idx++;
        }
        if (status != null) {
            sql.append(" AND a.status = ?").append(idx);
            params.add(status.name());
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }

        return ((Number) query.getSingleResult()).longValue();
    }
}
