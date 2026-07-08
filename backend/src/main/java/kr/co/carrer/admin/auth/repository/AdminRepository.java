package kr.co.carrer.admin.auth.repository;

import kr.co.carrer.admin.auth.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    // login_id/email은 각각 독립 unique 제약만 있고 교차 중복 방지 제약은 없어(생성 시 검증으로 방지),
    // 이론상 0~2건이 매칭될 수 있다 — 2건 매칭(모호한 케이스)은 서비스 레이어에서 로그인 실패로 처리한다.
    List<Admin> findByLoginIdOrEmail(String loginId, String email);
}
