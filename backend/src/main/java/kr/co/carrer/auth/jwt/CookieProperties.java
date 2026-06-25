package kr.co.carrer.auth.jwt;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "cookie")
@Getter
@Setter
public class CookieProperties {
    private boolean secure = true;
}
