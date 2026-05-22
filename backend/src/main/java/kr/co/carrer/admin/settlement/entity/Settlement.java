package kr.co.carrer.admin.settlement.entity;

import kr.co.carrer.admin.settlement.type.SettlementStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "settlements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long mentorId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 7)
    private String settlementMonth;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;
}
