package kr.co.carrer.admin.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.admin.member.type.SanctionType;
import kr.co.carrer.admin.member.type.SuspendDuration;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "suspend_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SuspendHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "suspend_history_id")
    private Long suspendHistoryId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "sanction_type", nullable = false, length = 20)
    private SanctionType sanctionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "duration", length = 20)
    private SuspendDuration duration;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static SuspendHistory create(UUID memberId, Long adminId, SanctionType sanctionType,
                                        SuspendDuration duration, String reason,
                                        LocalDate startDate, LocalDate endDate) {
        SuspendHistory history = new SuspendHistory();
        history.memberId = memberId;
        history.adminId = adminId;
        history.sanctionType = sanctionType;
        history.duration = duration;
        history.reason = reason;
        history.startDate = startDate;
        history.endDate = endDate;
        history.createdAt = ZonedDateTime.now();
        return history;
    }
}
