package kr.co.carrer.support;

import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.jwt.SessionProperties;
import kr.co.carrer.auth.filter.IpAclPort;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.SessionLivenessChecker;
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
    public RefreshTokenStore refreshTokenStore() {
        return Mockito.mock(RefreshTokenStore.class);
    }

    @Bean
    public SessionProperties sessionProperties() {
        return new SessionProperties();
    }

    @Bean
    public SessionLivenessChecker sessionLivenessChecker(RefreshTokenStore refreshTokenStore,
                                                         SessionProperties sessionProperties) {
        return new SessionLivenessChecker(refreshTokenStore, sessionProperties);
    }

    @Bean
    public IpAclPort ipAclPort() {
        return Mockito.mock(IpAclPort.class);
    }
}
