package kr.co.carrer.auth.jwt;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import static org.assertj.core.api.Assertions.assertThat;

class CookiePropertiesTest {

    private ResponseCookie build(CookieProperties props) {
        return props.applyDomain(ResponseCookie.from("refreshToken", "value").path("/")).build();
    }

    @Test
    @DisplayName("domain이 설정되면 쿠키에 Domain 속성이 적용된다 (서브도메인 공유)")
    void applyDomain_whenSet() {
        CookieProperties props = new CookieProperties();
        props.setDomain(".careerwave.kr");

        ResponseCookie cookie = build(props);

        assertThat(cookie.getDomain()).isEqualTo(".careerwave.kr");
        assertThat(cookie.toString()).contains("Domain=.careerwave.kr");
    }

    @Test
    @DisplayName("domain이 null이면 Domain 속성을 적용하지 않는다 (host-only)")
    void applyDomain_whenNull() {
        CookieProperties props = new CookieProperties();

        ResponseCookie cookie = build(props);

        assertThat(cookie.getDomain()).isNull();
        assertThat(cookie.toString()).doesNotContain("Domain=");
    }

    @Test
    @DisplayName("domain이 공백이면 Domain 속성을 적용하지 않는다 (host-only)")
    void applyDomain_whenBlank() {
        CookieProperties props = new CookieProperties();
        props.setDomain("   ");

        ResponseCookie cookie = build(props);

        assertThat(cookie.getDomain()).isNull();
        assertThat(cookie.toString()).doesNotContain("Domain=");
    }
}
