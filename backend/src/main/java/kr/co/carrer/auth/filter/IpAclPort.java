package kr.co.carrer.auth.filter;

import java.util.List;

/**
 * IP ACL 조회 포트 — auth 패키지는 admin 도메인을 직접 참조하지 않으므로
 * admin 도메인에서 이 인터페이스를 구현해 filter에 주입한다.
 */
public interface IpAclPort {

    List<String> findActiveIpRanges();

    boolean hasAnyIpAcl();
}
