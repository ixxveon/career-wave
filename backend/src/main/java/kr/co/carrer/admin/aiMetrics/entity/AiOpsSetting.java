package kr.co.carrer.admin.aiMetrics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import kr.co.carrer.admin.aiMetrics.type.AlertChannelType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Table(name = "ai_ops_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiOpsSetting {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ai_ops_setting_id")
    private Long aiOpsSettingId;

    @Column(name = "selected_model_id", nullable = false)
    private Long selectedModelId;

    @Column(name = "monthly_budget", nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyBudget;

    @Column(name = "alert_enabled", nullable = false)
    private boolean alertEnabled;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_channel", nullable = false, length = 20)
    private AlertChannelType alertChannel;

    @Column(name = "alert_threshold", nullable = false)
    private int alertThreshold;

    @Column(name = "rate_limit_enabled", nullable = false)
    private boolean rateLimitEnabled;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.updatedAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }
}
