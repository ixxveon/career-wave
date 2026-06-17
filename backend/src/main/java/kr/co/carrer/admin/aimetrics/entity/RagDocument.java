package kr.co.carrer.admin.aimetrics.entity;

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
import kr.co.carrer.admin.aimetrics.support.AiMetricsTimeZone;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "rag_documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RagDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rag_document_id")
    private Long ragDocumentId;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "file_uuid", nullable = false, columnDefinition = "UUID")
    private UUID fileUuid;

    @Column(name = "original_file_name", nullable = false, length = 255)
    private String originalFileName;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "chunk_count", nullable = false)
    private int chunkCount;

    @Column(name = "indexing_progress", nullable = false)
    private int indexingProgress;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RagDocumentStatusType status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    public static RagDocument upload(
            Long uploadedBy,
            UUID fileUuid,
            String originalFileName,
            String filePath,
            String mimeType,
            Long fileSize
    ) {
        RagDocument ragDocument = new RagDocument();
        ragDocument.uploadedBy = uploadedBy;
        ragDocument.fileUuid = fileUuid;
        ragDocument.originalFileName = originalFileName;
        ragDocument.filePath = filePath;
        ragDocument.mimeType = mimeType;
        ragDocument.fileSize = fileSize;
        ragDocument.chunkCount = 0;
        ragDocument.indexingProgress = 0;
        ragDocument.status = RagDocumentStatusType.UPLOADED;
        return ragDocument;
    }

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
