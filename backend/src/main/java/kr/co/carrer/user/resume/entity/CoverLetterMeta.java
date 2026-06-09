package kr.co.carrer.user.resume.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "cover_letter_meta")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoverLetterMeta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "letter_meta_id")
    private Long letterMetaId;

    @Column(name = "document_id", nullable = false, columnDefinition = "UUID")
    private UUID documentId;

    @Column(name = "company", nullable = false, length = 100)
    private String company;

    @Column(name = "job", nullable = false, length = 100)
    private String job;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static CoverLetterMeta of(UUID documentId, String company, String job) {
        CoverLetterMeta meta = new CoverLetterMeta();
        meta.documentId = documentId;
        meta.company = company;
        meta.job = job;
        meta.createdAt = ZonedDateTime.now();
        return meta;
    }
}
