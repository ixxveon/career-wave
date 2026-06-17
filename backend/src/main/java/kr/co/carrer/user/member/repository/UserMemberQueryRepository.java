package kr.co.carrer.user.member.repository;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserMemberQueryRepository {

    private final EntityManager entityManager;

    // 기업회원 아이디 찾기 — 이메일 + 사업자등록번호로 members JOIN company_profiles 조회
    // members.email = :email AND company_profiles.business_number = :businessNumber
    public List<String> findLoginIdsByEmailAndBusinessNumber(String email, String businessNumber) {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT m.login_id FROM members m " +
                "JOIN company_profiles cp ON cp.member_id = m.member_id " +
                "WHERE m.email = :email AND cp.business_number = :businessNumber"
        )
                .setParameter("email", email)
                .setParameter("businessNumber", businessNumber)
                .getResultList();

        return rows.stream().map(Object::toString).toList();
    }

    // 기업회원 아이디 찾기 — 휴대폰 + 사업자등록번호로 members JOIN company_profiles 조회
    public List<String> findLoginIdsByPhoneAndBusinessNumber(String phone, String businessNumber) {
        List<?> rows = entityManager.createNativeQuery(
                "SELECT m.login_id FROM members m " +
                "JOIN company_profiles cp ON cp.member_id = m.member_id " +
                "WHERE m.phone = :phone AND cp.business_number = :businessNumber"
        )
                .setParameter("phone", phone)
                .setParameter("businessNumber", businessNumber)
                .getResultList();

        return rows.stream().map(Object::toString).toList();
    }
}
