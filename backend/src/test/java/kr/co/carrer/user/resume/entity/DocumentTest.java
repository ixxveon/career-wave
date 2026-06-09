package kr.co.carrer.user.resume.entity;

import kr.co.carrer.user.resume.type.DocumentStatus;
import kr.co.carrer.user.resume.type.FileType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentTest {

    @Test
    @DisplayName("이력서 Document 생성 시 fileType=RESUME, status=UPLOADED, fileUrl/originalName이 저장된다")
    void ofResume_shouldSetCorrectFields() {
        UUID memberId = UUID.randomUUID();
        String fileUrl = "https://s3.amazonaws.com/resumes/2025-01-01/uuid.pdf";
        String originalName = "내이력서.pdf";

        Document doc = Document.ofResume(memberId, fileUrl, originalName);

        assertThat(doc.getMemberId()).isEqualTo(memberId);
        assertThat(doc.getFileType()).isEqualTo(FileType.RESUME);
        assertThat(doc.getFileUrl()).isEqualTo(fileUrl);
        assertThat(doc.getOriginalName()).isEqualTo(originalName);
        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.UPLOADED);
        assertThat(doc.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("자기소개서 Document 생성 시 fileType=COVER_LETTER, fileUrl/originalName은 null이다")
    void ofCoverLetter_shouldHaveNullFileFields() {
        UUID memberId = UUID.randomUUID();

        Document doc = Document.ofCoverLetter(memberId);

        assertThat(doc.getMemberId()).isEqualTo(memberId);
        assertThat(doc.getFileType()).isEqualTo(FileType.COVER_LETTER);
        assertThat(doc.getFileUrl()).isNull();
        assertThat(doc.getOriginalName()).isNull();
        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.UPLOADED);
    }

    @Test
    @DisplayName("markFailed 호출 시 status=FAILED, errorMessage가 저장된다")
    void markFailed_shouldUpdateStatusAndErrorMessage() {
        Document doc = Document.ofResume(UUID.randomUUID(), "url", "name.pdf");
        String errorMessage = "FastAPI 분석 타임아웃";

        doc.markFailed(errorMessage);

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.FAILED);
        assertThat(doc.getErrorMessage()).isEqualTo(errorMessage);
    }

    @Test
    @DisplayName("updateStatus 호출 시 status가 변경된다")
    void updateStatus_shouldChangeStatus() {
        Document doc = Document.ofResume(UUID.randomUUID(), "url", "name.pdf");

        doc.updateStatus(DocumentStatus.ANALYZING);

        assertThat(doc.getStatus()).isEqualTo(DocumentStatus.ANALYZING);
    }
}
