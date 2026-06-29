package kr.co.carrer.user.member.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "terms_documents")
@IdClass(TermsDocumentId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TermsDocument {

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "document_code", length = 40, nullable = false)
    private TermsDocumentCode documentCode;

    @Id
    @Column(name = "version", length = 30, nullable = false)
    private String version;

    @Column(name = "effective_from", nullable = false)
    private Instant effectiveFrom;

    @Column(name = "content_hash", nullable = false, length = 128)
    private String contentHash;

    @Column(name = "published_url", nullable = false, length = 500)
    private String publishedUrl;

    @Column(name = "required", nullable = false)
    private boolean required;
}
