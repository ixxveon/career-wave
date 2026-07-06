package kr.co.carrer.support;

import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration
public class SecurityMockConfig {

    @Bean
    public JwtTokenProvider jwtTokenProvider() {
        return Mockito.mock(JwtTokenProvider.class);
    }

    @Bean
    public TokenBlacklistStore tokenBlacklistStore() {
        return Mockito.mock(TokenBlacklistStore.class);
    }

    @Bean
    public IpAclPort ipAclPort() {
        return Mockito.mock(IpAclPort.class);
    }
}
