package kr.co.carrer.admin.settlement.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.settlement.type.SettlementItemType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "settlement_items",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_settlement_item_payment",
            columnNames = {"settlement_id", "payment_id", "item_type"})
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementItem {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settlement_item_id")
    private Long settlementItemId;

    @Column(name = "settlement_id", nullable = false)
    private Long settlementId;

    @Column(name = "payment_id", nullable = false, columnDefinition = "UUID")
    private UUID paymentId;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private SettlementItemType itemType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = ZonedDateTime.now(KST);
    }

    public static SettlementItem create(Long settlementId, UUID paymentId,
                                        int amount, SettlementItemType itemType) {
        SettlementItem item = new SettlementItem();
        item.settlementId = settlementId;
        item.paymentId = paymentId;
        item.amount = amount;
        item.itemType = itemType;
        return item;
    }
}
