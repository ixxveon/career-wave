package kr.co.carrer.admin.admin.entity;

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

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Entity
@Table(name = "ip_acl")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IpAcl {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ip_acl_id")
    private Long ipAclId;

    @Column(name = "label", nullable = false, length = 100)
    private String label;

    @Column(name = "ip_range", nullable = false, unique = true, length = 50)
    private String ipRange;

    @Column(name = "is_enabled", nullable = false)
    private Boolean isEnabled;

    @Column(name = "description", length = 200)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    public static IpAcl create(String label, String ipRange, String description) {
        IpAcl ipAcl = new IpAcl();
        ipAcl.label = label;
        ipAcl.ipRange = ipRange;
        ipAcl.description = description;
        ipAcl.isEnabled = true;
        return ipAcl;
    }

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(SERVICE_ZONE_ID);
        this.createdAt = now;
        this.updatedAt = now;
        if (this.isEnabled == null) {
            this.isEnabled = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(SERVICE_ZONE_ID);
    }

    public void updateEnabled(boolean isEnabled) {
        this.isEnabled = isEnabled;
    }
}
