package kr.co.carrer.auth.jwt;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

/**
 * 유휴 세션(idle session) 타임아웃 설정.
 *
 * - idleTimeout            : 사용자(User) 무활동 허용 시간(ms). 인증 요청마다 Redis 세션 TTL을 이 값으로 재설정(슬라이딩)하며,
 *                            초과 시 키가 만료되어 세션이 종료된다.
 * - adminIdleTimeout       : 관리자(Admin) 무활동 허용 시간(ms). 관리자는 대시보드를 장시간 열어 두고 작업하는 특성상
 *                            사용자보다 넉넉하게 둔다(기본 3시간). {@link #getIdleTimeout(AccountType)}가 계정 유형별로 분기한다.
 * - existenceCheckEnabled  : access 요청 시 Redis 세션 존재성 검증 on/off. 장애/부하 대비 kill-switch.
 *
 * 절대 상한(refresh 만료: User 14일 / Admin 1일)은 refresh 토큰 exp로 별도 고정되며,
 * 여기의 유휴 타임아웃과 함께 "유휴 + 절대" 이중 상한을 구성한다.
 *
 * `@Validated` — 잘못된 env(0/음수 idleTimeout)로 전 세션이 즉시 만료되는 사고를 기동 시점에 차단(fail-fast).
 */
@Validated
@Component
@ConfigurationProperties(prefix = "session")
public class SessionProperties {

    @Positive
    private long idleTimeout = 3_600_000L;          // User 60분
    @Positive
    private long adminIdleTimeout = 10_800_000L;    // Admin 180분(3시간)
    private boolean existenceCheckEnabled = true;

    public long getIdleTimeout() { return idleTimeout; }
    public void setIdleTimeout(long idleTimeout) { this.idleTimeout = idleTimeout; }

    public long getAdminIdleTimeout() { return adminIdleTimeout; }
    public void setAdminIdleTimeout(long adminIdleTimeout) { this.adminIdleTimeout = adminIdleTimeout; }

    /** 계정 유형별 유휴 타임아웃(ms). ADMIN은 adminIdleTimeout, 그 외(User/Company)는 idleTimeout. */
    public long getIdleTimeout(AccountType accountType) {
        return accountType == AccountType.ADMIN ? adminIdleTimeout : idleTimeout;
    }

    public boolean isExistenceCheckEnabled() { return existenceCheckEnabled; }
    public void setExistenceCheckEnabled(boolean existenceCheckEnabled) { this.existenceCheckEnabled = existenceCheckEnabled; }
}
