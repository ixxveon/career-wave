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
    private boolean secure = true;

    /**
     * 쿠키 Domain 속성. 프론트(www)와 백엔드(api)가 서로 다른 서브도메인에 배포되는
     * 운영 환경에서 ".careerwave.kr" 로 설정하면 두 서브도메인이 쿠키를 공유한다.
     * 로컬(단일 host)에서는 비워 두어 host-only 쿠키로 동작시킨다.
     */
    private String domain;

    /** domain이 설정된 경우에만 쿠키 빌더에 Domain 속성을 적용한다. */
    public ResponseCookie.ResponseCookieBuilder applyDomain(ResponseCookie.ResponseCookieBuilder builder) {
        if (domain != null && !domain.isBlank()) {
            builder.domain(domain);
        }
        return builder;
    }
}
