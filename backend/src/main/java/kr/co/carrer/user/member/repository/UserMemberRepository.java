package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.type.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserMemberRepository extends JpaRepository<Member, UUID> {

    Optional<Member> findByLoginId(String loginId);

    boolean existsByLoginId(String loginId);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    // 개인회원 아이디 찾기: 이메일 + 회원 유형으로 조회
    Optional<Member> findByEmailAndRoleType(String email, RoleType roleType);

    // 개인회원 아이디 찾기: 휴대폰 + 회원 유형으로 조회
    Optional<Member> findByPhoneAndRoleType(String phone, RoleType roleType);
}
