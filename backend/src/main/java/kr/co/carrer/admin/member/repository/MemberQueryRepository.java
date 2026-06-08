package kr.co.carrer.admin.member.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import kr.co.carrer.admin.member.dto.HrManagerDTO;
import kr.co.carrer.admin.member.dto.MemberDTO;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import kr.co.carrer.admin.member.type.PermissionLevel;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class MemberQueryRepository {

    @PersistenceContext
    private EntityManager em;

    public List<MemberDTO.ResponseList> findMembers(RoleType role, MemberStatus status,
                                                     SubscriptionStatus plan, String keyword,
                                                     ZonedDateTime startDate, ZonedDateTime endDate,
                                                     int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT m.member_id, m.login_id, m.name, m.email, m.role_type, m.subscription_status,
                   m.member_status, m.warning_count,
                   (SELECT COUNT(*) FROM reports r WHERE r.member_id = m.member_id) AS report_count,
                   m.created_at, m.last_login_at
            FROM members m
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (role != null) {
            sql.append(" AND m.role_type = ?").append(idx++);
            params.add(role.name());
        }
        if (status != null) {
            sql.append(" AND m.member_status = ?").append(idx++);
            params.add(status.name());
        }
        if (plan != null) {
            sql.append(" AND m.subscription_status = ?").append(idx++);
            params.add(plan.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (m.name ILIKE ?").append(idx)
               .append(" OR m.email ILIKE ?").append(idx)
               .append(" OR m.login_id ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
        }
        if (startDate != null) {
            sql.append(" AND m.created_at >= ?").append(idx++);
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND m.created_at <= ?").append(idx++);
            params.add(endDate);
        }

        sql.append(" ORDER BY m.created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<MemberDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new MemberDTO.ResponseList(
                UUID.fromString(row[0].toString()),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                RoleType.valueOf((String) row[4]),
                SubscriptionStatus.valueOf((String) row[5]),
                MemberStatus.valueOf((String) row[6]),
                ((Number) row[7]).intValue(),
                ((Number) row[8]).longValue(),
                row[9] != null ? ((java.sql.Timestamp) row[9]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null,
                row[10] != null ? ((java.sql.Timestamp) row[10]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null
            ));
        }
        return result;
    }

    public long countMembers(RoleType role, MemberStatus status, SubscriptionStatus plan,
                              String keyword, ZonedDateTime startDate, ZonedDateTime endDate) {
        StringBuilder sql = new StringBuilder("SELECT COUNT(*) FROM members m WHERE 1=1");

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (role != null) {
            sql.append(" AND m.role_type = ?").append(idx++);
            params.add(role.name());
        }
        if (status != null) {
            sql.append(" AND m.member_status = ?").append(idx++);
            params.add(status.name());
        }
        if (plan != null) {
            sql.append(" AND m.subscription_status = ?").append(idx++);
            params.add(plan.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (m.name ILIKE ?").append(idx)
               .append(" OR m.email ILIKE ?").append(idx)
               .append(" OR m.login_id ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
        }
        if (startDate != null) {
            sql.append(" AND m.created_at >= ?").append(idx++);
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND m.created_at <= ?").append(idx++);
            params.add(endDate);
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<MemberDTO.ResponseDetail> findMemberDetail(UUID memberId) {
        String sql = """
            SELECT m.member_id, m.login_id, m.name, m.email, m.role_type, m.subscription_status,
                   m.member_status, m.warning_count,
                   (SELECT COUNT(*) FROM reports r WHERE r.member_id = m.member_id) AS report_count,
                   m.created_at, m.last_login_at
            FROM members m
            WHERE m.member_id = ?1
            """;
        Query query = em.createNativeQuery(sql);
        query.setParameter(1, memberId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new MemberDTO.ResponseDetail(
            UUID.fromString(row[0].toString()),
            (String) row[1],
            (String) row[2],
            (String) row[3],
            RoleType.valueOf((String) row[4]),
            SubscriptionStatus.valueOf((String) row[5]),
            MemberStatus.valueOf((String) row[6]),
            ((Number) row[7]).intValue(),
            ((Number) row[8]).longValue(),
            row[9] != null ? ((java.sql.Timestamp) row[9]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null,
            row[10] != null ? ((java.sql.Timestamp) row[10]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null
        ));
    }

    public List<HrManagerDTO.ResponseList> findHrManagers(HrStatus hrStatus, String keyword,
                                                            ZonedDateTime startDate, ZonedDateTime endDate,
                                                            int offset, int size) {
        StringBuilder sql = new StringBuilder("""
            SELECT m.member_id, m.name, m.email,
                   cp.company_name, cp.business_number,
                   h.permission_level, cp.cert_file_url, cp.cert_file_name,
                   m.created_at, h.approved_at, h.hr_status
            FROM hr_managers h
            JOIN members m ON m.member_id = h.member_id
            LEFT JOIN company_profiles cp ON cp.company_profile_id = h.company_profile_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (hrStatus != null) {
            sql.append(" AND h.hr_status = ?").append(idx++);
            params.add(hrStatus.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (m.name ILIKE ?").append(idx)
               .append(" OR cp.company_name ILIKE ?").append(idx)
               .append(" OR m.email ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
        }
        if (startDate != null) {
            sql.append(" AND m.created_at >= ?").append(idx++);
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND m.created_at <= ?").append(idx++);
            params.add(endDate);
        }

        sql.append(" ORDER BY m.created_at DESC LIMIT ?").append(idx).append(" OFFSET ?").append(idx + 1);
        params.add(size);
        params.add(offset);

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        List<HrManagerDTO.ResponseList> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(new HrManagerDTO.ResponseList(
                UUID.fromString(row[0].toString()),
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (String) row[4],
                row[5] != null ? PermissionLevel.valueOf((String) row[5]) : null,
                (String) row[6],
                (String) row[7],
                row[8] != null ? ((java.sql.Timestamp) row[8]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null,
                row[9] != null ? ((java.sql.Timestamp) row[9]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null,
                HrStatus.valueOf((String) row[10])
            ));
        }
        return result;
    }

    public long countHrManagers(HrStatus hrStatus, String keyword,
                                 ZonedDateTime startDate, ZonedDateTime endDate) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(*)
            FROM hr_managers h
            JOIN members m ON m.member_id = h.member_id
            LEFT JOIN company_profiles cp ON cp.company_profile_id = h.company_profile_id
            WHERE 1=1
            """);

        List<Object> params = new ArrayList<>();
        int idx = 1;

        if (hrStatus != null) {
            sql.append(" AND h.hr_status = ?").append(idx++);
            params.add(hrStatus.name());
        }
        if (keyword != null && !keyword.isBlank()) {
            sql.append(" AND (m.name ILIKE ?").append(idx)
               .append(" OR cp.company_name ILIKE ?").append(idx)
               .append(" OR m.email ILIKE ?").append(idx).append(")");
            params.add("%" + keyword + "%");
            idx++;
        }
        if (startDate != null) {
            sql.append(" AND m.created_at >= ?").append(idx++);
            params.add(startDate);
        }
        if (endDate != null) {
            sql.append(" AND m.created_at <= ?").append(idx++);
            params.add(endDate);
        }

        Query query = em.createNativeQuery(sql.toString());
        for (int i = 0; i < params.size(); i++) {
            query.setParameter(i + 1, params.get(i));
        }
        return ((Number) query.getSingleResult()).longValue();
    }

    public Optional<HrManagerDTO.ResponseDetail> findHrManagerDetail(UUID memberId) {
        String sql = """
            SELECT m.member_id, m.name, m.email,
                   cp.company_name, cp.business_number,
                   h.permission_level, cp.cert_file_url, cp.cert_file_name,
                   m.created_at, h.approved_at, h.hr_status, h.reject_reason
            FROM hr_managers h
            JOIN members m ON m.member_id = h.member_id
            LEFT JOIN company_profiles cp ON cp.company_profile_id = h.company_profile_id
            WHERE m.member_id = ?1
            """;
        Query query = em.createNativeQuery(sql);
        query.setParameter(1, memberId);

        List<?> rows = query.getResultList();
        if (rows.isEmpty()) return Optional.empty();

        Object[] row = (Object[]) rows.get(0);
        return Optional.of(new HrManagerDTO.ResponseDetail(
            UUID.fromString(row[0].toString()),
            (String) row[1],
            (String) row[2],
            (String) row[3],
            (String) row[4],
            row[5] != null ? PermissionLevel.valueOf((String) row[5]) : null,
            (String) row[6],
            (String) row[7],
            row[8] != null ? ((java.sql.Timestamp) row[8]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null,
            row[9] != null ? ((java.sql.Timestamp) row[9]).toInstant().atZone(java.time.ZoneId.systemDefault()) : null,
            HrStatus.valueOf((String) row[10]),
            (String) row[11]
        ));
    }
}
