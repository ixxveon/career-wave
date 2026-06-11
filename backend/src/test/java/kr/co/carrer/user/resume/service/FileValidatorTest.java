package kr.co.carrer.user.resume.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.resume.exception.ResumeErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FileValidatorTest {

    private FileValidator fileValidator;

    @BeforeEach
    void setUp() {
        fileValidator = new FileValidator();
    }

    @Test
    @DisplayName("10MB 초과 파일 업로드 시 INVALID_FILE_SIZE 예외가 발생한다")
    void validate_fileSizeExceeded_throwsException() {
        byte[] oversizedContent = new byte[10 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.pdf", "application/pdf", oversizedContent
        );

        assertThatThrownBy(() -> fileValidator.validate(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ResumeErrorCode.INVALID_FILE_SIZE));
    }

    @Test
    @DisplayName("허용되지 않는 확장자 파일 업로드 시 INVALID_FILE_TYPE 예외가 발생한다")
    void extractExtension_invalidExtension_throwsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/octet-stream", new byte[]{1, 2, 3}
        );

        assertThatThrownBy(() -> fileValidator.extractExtension(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ResumeErrorCode.INVALID_FILE_TYPE));
    }

    @Test
    @DisplayName("확장자 없는 파일명일 경우 INVALID_FILE_TYPE 예외가 발생한다")
    void extractExtension_noExtension_throwsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "noextension", "application/pdf", new byte[]{1, 2, 3}
        );

        assertThatThrownBy(() -> fileValidator.extractExtension(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ResumeErrorCode.INVALID_FILE_TYPE));
    }

    @Test
    @DisplayName("확장자를 .pdf로 위조한 EXE 파일 업로드 시 INVALID_FILE_TYPE 예외가 발생한다")
    void validate_mimeTypeForgery_throwsException() {
        // EXE 파일 시그니처(MZ 헤더)를 .pdf 확장자로 위장
        byte[] exeHeader = new byte[]{0x4D, 0x5A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
        MockMultipartFile file = new MockMultipartFile(
                "file", "malicious.pdf", "application/pdf", exeHeader
        );

        assertThatThrownBy(() -> fileValidator.validate(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ResumeErrorCode.INVALID_FILE_TYPE));
    }

    @Test
    @DisplayName("유효한 PDF 확장자 파일의 extension을 올바르게 추출한다")
    void extractExtension_validPdf_returnsExtension() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.PDF", "application/pdf", new byte[]{1, 2, 3}
        );

        String extension = fileValidator.extractExtension(file);

        assertThat(extension).isEqualTo("pdf");
    }
}
