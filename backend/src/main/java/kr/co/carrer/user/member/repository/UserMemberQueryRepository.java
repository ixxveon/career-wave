package kr.co.carrer.user.member.repository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserMemberQueryRepository {

    private final EntityManager entityManager;

    // 기업회원 아이디 찾기 — managerName + businessNumber + verificationToken.target(email)
    // spec: managerName · businessNumber · verificationToken 3개 일치 시 반환
    // hr_managers JOIN: 유효한 HR 담당자 레코드가 존재하는 계정만 조회
    // hr_status 필터 미적용: 아이디 찾기는 로그인 자격 검증이 아니므로 REMOVED 포함 (spec FR-011)
    public List<String> findLoginIdsByManagerNameAndBusinessNumberAndEmail(
            String managerName, String businessNumber, String email) {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT m.login_id FROM members m " +
                "JOIN company_profiles cp ON cp.member_id = m.member_id " +
                "JOIN hr_managers h ON h.member_id = m.member_id " +
                "WHERE m.name = :managerName " +
                "AND cp.business_number = :businessNumber " +
                "AND m.email = :email " +
                "AND m.role_type = 'COMPANY'"
        )
                .setParameter("managerName", managerName)
                .setParameter("businessNumber", businessNumber)
                .setParameter("email", email)
                .getResultList();

        return rows.stream().map(Object::toString).toList();
    }

    // 기업회원 아이디 찾기 — managerName + businessNumber + verificationToken.target(phone)
    public List<String> findLoginIdsByManagerNameAndBusinessNumberAndPhone(
            String managerName, String businessNumber, String phone) {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT m.login_id FROM members m " +
                "JOIN company_profiles cp ON cp.member_id = m.member_id " +
                "JOIN hr_managers h ON h.member_id = m.member_id " +
                "WHERE m.name = :managerName " +
                "AND cp.business_number = :businessNumber " +
                "AND m.phone = :phone " +
                "AND m.role_type = 'COMPANY'"
        )
                .setParameter("managerName", managerName)
                .setParameter("businessNumber", businessNumber)
                .setParameter("phone", phone)
                .getResultList();

        return rows.stream().map(Object::toString).toList();
    }
}
