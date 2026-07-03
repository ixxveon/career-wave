package kr.co.carrer.auth.jwt;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import static org.assertj.core.api.Assertions.assertThat;

class CookiePropertiesTest {

    @Test
    @DisplayName("domain이 설정되면 refresh/handoff 쿠키에 Domain 속성이 적용된다 (서브도메인 공유)")
    void domain_whenSet() {
        CookieProperties props = new CookieProperties();
        props.setDomain(".careerwave.kr");

        ResponseCookie refresh = props.refreshTokenCookie("token", 3600);
        ResponseCookie handoff = props.handoffCookie("cw_oauth_login_token", "token");

        assertThat(refresh.getDomain()).isEqualTo(".careerwave.kr");
        assertThat(handoff.getDomain()).isEqualTo(".careerwave.kr");
    }

    @Test
    @DisplayName("domain이 null이면 Domain 속성을 적용하지 않는다 (host-only)")
    void domain_whenNull() {
        CookieProperties props = new CookieProperties();

        assertThat(props.refreshTokenCookie("token", 3600).getDomain()).isNull();
        assertThat(props.handoffCookie("cw_oauth_login_token", "token").getDomain()).isNull();
    }

    @Test
    @DisplayName("domain이 공백이면 Domain 속성을 적용하지 않는다 (host-only)")
    void domain_whenBlank() {
        CookieProperties props = new CookieProperties();
        props.setDomain("   ");

        assertThat(props.refreshTokenCookie("token", 3600).getDomain()).isNull();
        assertThat(props.handoffCookie("cw_oauth_login_token", "token").getDomain()).isNull();
    }

    @Test
    @DisplayName("refreshTokenCookie는 httpOnly·Strict·지정 path로 생성된다")
    void refreshTokenCookie_attributes() {
        CookieProperties props = new CookieProperties();

        ResponseCookie cookie = props.refreshTokenCookie("value", 0);

        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getPath()).isEqualTo("/api/v1/user/members");
        assertThat(cookie.getMaxAge().getSeconds()).isZero();
    }

    @Test
    @DisplayName("handoffCookie는 프론트 JS가 읽을 수 있도록 httpOnly=false로 생성된다")
    void handoffCookie_attributes() {
        CookieProperties props = new CookieProperties();

        ResponseCookie cookie = props.handoffCookie("cw_oauth_login_token", "value");

        assertThat(cookie.isHttpOnly()).isFalse();
        assertThat(cookie.getPath()).isEqualTo("/");
        assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(60);
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
    }
}
