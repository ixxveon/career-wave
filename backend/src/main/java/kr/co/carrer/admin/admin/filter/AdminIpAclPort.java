package kr.co.carrer.admin.admin.filter;

import kr.co.carrer.admin.admin.repository.IpAclRepository;
import kr.co.carrer.auth.filter.IpAclPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AdminIpAclPort implements IpAclPort {

    private final IpAclRepository ipAclRepository;

    @Override
    public List<String> findActiveIpRanges() {
        return ipAclRepository.findAllByIsEnabledTrue()
                .stream()
                .map(ipAcl -> ipAcl.getIpRange())
                .toList();
    }
}
