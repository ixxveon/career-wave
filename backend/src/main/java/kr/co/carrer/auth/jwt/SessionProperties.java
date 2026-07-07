package kr.co.carrer.auth.jwt;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 유휴 세션(idle session) 타임아웃 설정. User/Admin 공통.
 *
 * - idleTimeout      : 무활동 허용 시간(ms). 초과 시 Redis 세션 키가 만료되어 세션이 종료된다.
 * - renewThreshold   : Redis 세션 TTL 잔여가 이 값(ms) 미만일 때만 슬라이딩 갱신 → 요청당 write 최소화.
 * - existenceCheckEnabled : access 요청 시 Redis 세션 존재성 검증 on/off. 장애/부하 대비 kill-switch.
 *
 * 절대 상한(refresh 만료: User 14일 / Admin 1일)은 refresh 토큰의 exp로 별도 고정되며,
 * 여기의 유휴 타임아웃과 함께 "유휴 + 절대" 이중 상한을 구성한다.
 */
@Component
@ConfigurationProperties(prefix = "session")
public class SessionProperties {

    private long idleTimeout = 3_600_000L;      // 60분
    private long renewThreshold = 3_000_000L;   // 50분
    private boolean existenceCheckEnabled = true;

    public long getIdleTimeout() { return idleTimeout; }
    public void setIdleTimeout(long idleTimeout) { this.idleTimeout = idleTimeout; }

    public long getRenewThreshold() { return renewThreshold; }
    public void setRenewThreshold(long renewThreshold) { this.renewThreshold = renewThreshold; }

    public boolean isExistenceCheckEnabled() { return existenceCheckEnabled; }
    public void setExistenceCheckEnabled(boolean existenceCheckEnabled) { this.existenceCheckEnabled = existenceCheckEnabled; }
}
