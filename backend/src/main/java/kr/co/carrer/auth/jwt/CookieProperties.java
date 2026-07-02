package kr.co.carrer.auth.jwt;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "cookie")
@Getter
@Setter
public class CookieProperties {

    private static final String REFRESH_TOKEN_NAME = "refreshToken";
    private static final String REFRESH_TOKEN_PATH = "/api/v1/user/members";

    private boolean secure = true;

    /**
     * 쿠키 Domain 속성. 프론트(www)와 백엔드(api)가 서로 다른 서브도메인에 배포되는
     * 운영 환경에서 ".careerwave.kr" 로 설정하면 두 서브도메인이 쿠키를 공유한다.
     * 로컬(단일 host)에서는 비워 두어 host-only 쿠키로 동작시킨다.
     */
    private String domain;

    /**
     * refresh token 쿠키를 공통 속성으로 생성한다. (로그인 / 재발급 / 로그아웃 clear 공용)
     * maxAgeSeconds=0, value="" 로 호출하면 삭제용 쿠키가 된다.
     */
    public ResponseCookie refreshTokenCookie(String value, long maxAgeSeconds) {
        return applyDomain(ResponseCookie.from(REFRESH_TOKEN_NAME, value)
                        .httpOnly(true)
                        .secure(secure)
                        .path(REFRESH_TOKEN_PATH)
                        .maxAge(maxAgeSeconds)
                        .sameSite("Strict"))
                .build();
    }

    /**
     * OAuth handoff 쿠키를 생성한다. 프론트(www)에서 JS로 읽어야 하므로 httpOnly=false이며,
     * 백엔드(api)가 설정한 쿠키를 프론트에서 읽을 수 있도록 Domain을 적용한다. (단기 60초)
     */
    public ResponseCookie handoffCookie(String name, String value) {
        return applyDomain(ResponseCookie.from(name, value)
                        .path("/")
                        .maxAge(60)
                        .sameSite("Strict")
                        .httpOnly(false))
                .build();
    }

    /** domain이 설정된 경우에만 쿠키 빌더에 Domain 속성을 적용한다. */
    private ResponseCookie.ResponseCookieBuilder applyDomain(ResponseCookie.ResponseCookieBuilder builder) {
        if (domain != null && !domain.isBlank()) {
            builder.domain(domain);
        }
        return builder;
    }
}
