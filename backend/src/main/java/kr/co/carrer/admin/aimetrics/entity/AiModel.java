package kr.co.carrer.admin.aimetrics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import kr.co.carrer.admin.aimetrics.support.AiMetricsTimeZone;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Entity
@Table(name = "ai_models")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiModel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ai_model_id")
    private Long aiModelId;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "display_type", nullable = false, length = 100)
    private String displayType;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider;

    @Column(name = "input_token_price", nullable = false, precision = 12, scale = 6)
    private BigDecimal inputTokenPrice;

    @Column(name = "output_token_price", nullable = false, precision = 12, scale = 6)
    private BigDecimal outputTokenPrice;

    @Column(name = "is_enabled", nullable = false)
    private boolean isEnabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(AiMetricsTimeZone.SERVICE_ZONE_ID);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(AiMetricsTimeZone.SERVICE_ZONE_ID);
    }
}
