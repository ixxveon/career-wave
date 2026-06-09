package kr.co.carrer.user.member.repository;

import kr.co.carrer.user.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MemberRepository extends JpaRepository<Member, UUID> {
    Optional<Member> findByLoginId(String loginId);
}
