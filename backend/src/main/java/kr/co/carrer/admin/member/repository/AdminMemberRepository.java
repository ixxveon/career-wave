package kr.co.carrer.admin.member.repository;

import kr.co.carrer.admin.member.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface AdminMemberRepository extends JpaRepository<Member, UUID>, JpaSpecificationExecutor<Member> {
}
