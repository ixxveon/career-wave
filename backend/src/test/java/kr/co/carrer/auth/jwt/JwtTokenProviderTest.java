package kr.co.carrer.auth.jwt;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(900000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        provider = new JwtTokenProvider(props);
    }

    @Test
    void createAccessToken_USER_유효한_토큰_생성() {
        String token = provider.createAccessToken("uuid-1234", AccountType.USER, "ROLE_USER", null);
        assertThat(token).isNotBlank();
        assertThat(provider.validate(token, AccountType.USER)).isTrue();
    }

    @Test
    void createAccessToken_ADMIN_adminRole_claim_포함() {
        String token = provider.createAccessToken("1", AccountType.ADMIN, "ROLE_ADMIN", "MASTER");
        Claims claims = provider.parse(token, AccountType.ADMIN);
        assertThat(claims.get("adminRole", String.class)).isEqualTo("MASTER");
        assertThat(claims.get("roleType", String.class)).isEqualTo("ROLE_ADMIN");
    }

    @Test
    void parse_subject와_accountType_정상_반환() {
        String token = provider.createAccessToken("uuid-abc", AccountType.COMPANY, "ROLE_COMPANY", null);
        Claims claims = provider.parse(token, AccountType.USER);
        assertThat(claims.getSubject()).isEqualTo("uuid-abc");
        assertThat(claims.get("accountType", String.class)).isEqualTo("COMPANY");
    }

    @Test
    void validate_만료된_토큰_false_반환() {
        JwtProperties shortProps = new JwtProperties();
        shortProps.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        shortProps.getUser().setAccessExpiration(-1000L); // 이미 만료
        shortProps.getUser().setRefreshExpiration(1000L);
        shortProps.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        shortProps.getAdmin().setAccessExpiration(900000L);
        shortProps.getAdmin().setRefreshExpiration(86400000L);
        JwtTokenProvider shortProvider = new JwtTokenProvider(shortProps);

        String token = shortProvider.createAccessToken("uuid-1", AccountType.USER, "ROLE_USER", null);
        assertThat(shortProvider.validate(token, AccountType.USER)).isFalse();
    }

    @Test
    void validate_위조된_토큰_false_반환() {
        String token = provider.createAccessToken("uuid-1", AccountType.USER, "ROLE_USER", null);
        String tampered = token.substring(0, token.length() - 4) + "xxxx";
        assertThat(provider.validate(tampered, AccountType.USER)).isFalse();
    }

    @Test
    void extractAccountType_USER_정상_추출() {
        String token = provider.createAccessToken("uuid-1", AccountType.USER, "ROLE_USER", null);
        assertThat(provider.extractAccountType(token)).isEqualTo(AccountType.USER);
    }

    @Test
    void extractAccountType_ADMIN_정상_추출() {
        String token = provider.createAccessToken("1", AccountType.ADMIN, "ROLE_ADMIN", "CS");
        assertThat(provider.extractAccountType(token)).isEqualTo(AccountType.ADMIN);
    }

    @Test
    void createRefreshToken_유효한_토큰_생성() {
        String token = provider.createRefreshToken("uuid-1234", AccountType.USER, null);
        assertThat(provider.validate(token, AccountType.USER)).isTrue();
        Claims claims = provider.parse(token, AccountType.USER);
        assertThat(claims.getSubject()).isEqualTo("uuid-1234");
    }
}
