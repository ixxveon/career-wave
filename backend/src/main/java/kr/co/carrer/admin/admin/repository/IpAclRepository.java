package kr.co.carrer.admin.admin.repository;

import kr.co.carrer.admin.admin.entity.IpAcl;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IpAclRepository extends JpaRepository<IpAcl, Long> {

    boolean existsByIpRange(String ipRange);
}
