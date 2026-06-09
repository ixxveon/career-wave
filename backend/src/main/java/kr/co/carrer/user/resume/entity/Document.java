package kr.co.carrer.user.resume.entity;

import jakarta.persistence.*;
import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.type.FileType;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "document_id", columnDefinition = "UUID")
    private UUID documentId;

    @Column(name = "member_id", nullable = false, columnDefinition = "UUID")
    private UUID memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 20)
    private FileType fileType;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "original_name", length = 200)
    private String originalName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DocumentStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    // 이력서 업로드용 정적 팩토리 메서드
    public static Document ofResume(UUID memberId, String fileUrl, String originalName) {
        Document doc = new Document();
        doc.memberId = memberId;
        doc.fileType = FileType.RESUME;
        doc.fileUrl = fileUrl;
        doc.originalName = originalName;
        doc.status = DocumentStatus.UPLOADED;
        doc.createdAt = ZonedDateTime.now();
        return doc;
    }

    // 자기소개서 제출용 정적 팩토리 메서드
    public static Document ofCoverLetter(UUID memberId) {
        Document doc = new Document();
        doc.memberId = memberId;
        doc.fileType = FileType.COVER_LETTER;
        doc.fileUrl = null;
        doc.originalName = null;
        doc.status = DocumentStatus.UPLOADED;
        doc.createdAt = ZonedDateTime.now();
        return doc;
    }

    public void markFailed(String errorMessage) {
        this.status = DocumentStatus.FAILED;
        this.errorMessage = errorMessage;
    }

    public void updateStatus(DocumentStatus status) {
        this.status = status;
    }
}
