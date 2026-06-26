package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "member_terms_document_agreements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberTermsDocumentAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "agreement_event_id")
    private Long agreementEventId;

    @Column(name = "member_id", nullable = false, columnDefinition = "uuid")
    private UUID memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_code", nullable = false, length = 40)
    private TermsDocumentCode documentCode;

    @Column(name = "version", nullable = false, length = 30)
    private String version;

    @Column(name = "agreed", nullable = false)
    private boolean agreed;

    @Column(name = "agreed_at", nullable = false, updatable = false)
    private Instant agreedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "ip_address_hash", length = 128)
    private String ipAddressHash;

    @Column(name = "user_agent_hash", length = 128)
    private String userAgentHash;

    @PrePersist
    protected void onCreate() {
        if (agreedAt == null) agreedAt = Instant.now();
    }

    public static MemberTermsDocumentAgreement record(UUID memberId, TermsDocumentCode documentCode,
                                                      String version, boolean agreed) {
        Objects.requireNonNull(memberId, "memberId must not be null");
        Objects.requireNonNull(documentCode, "documentCode must not be null");
        Objects.requireNonNull(version, "version must not be null");
        MemberTermsDocumentAgreement agreement = new MemberTermsDocumentAgreement();
        agreement.memberId = memberId;
        agreement.documentCode = documentCode;
        agreement.version = version;
        agreement.agreed = agreed;
        return agreement;
    }
}
