package kr.co.carrer.user.member.infrastructure.file;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StubEmploymentCertificateFileAdapterTest {

    // Tika가 application/pdf로 감지하는 최소 유효 PDF 바이트
    private static final byte[] MINIMAL_PDF =
            "%PDF-1.0\n1 0 obj<</Type/Catalog>>endobj\n%%EOF".getBytes();

    private StubEmploymentCertificateFileAdapter adapter;

    @BeforeEach
    void setUp() throws Exception {
        adapter = new StubEmploymentCertificateFileAdapter();
        java.lang.reflect.Field field = StubEmploymentCertificateFileAdapter.class.getDeclaredField("bucketName");
        field.setAccessible(true);
        field.set(adapter, "careerwave-test");
    }

    // ─── 업로드 성공 ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("유효한 PDF 업로드 시 stub-로 시작하는 fileId를 반환한다")
    void upload_성공_stub_fileId_반환() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", MINIMAL_PDF);

        UserRegisterDto.ResponseEmploymentCertificateUpload result = adapter.upload(file);

        assertThat(result.fileId()).startsWith("stub-");
        assertThat(result.originalName()).isEqualTo("certificate.pdf");
        assertThat(result.mimeType()).isEqualTo("application/pdf");
        assertThat(result.uploadedAt()).isNotNull();
    }

    // ─── 5MB 초과 ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("5MB를 초과하는 파일 업로드 시 EMPLOYMENT_FILE_TOO_LARGE를 반환한다")
    void upload_5MB_초과_EMPLOYMENT_FILE_TOO_LARGE() {
        byte[] largeContent = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.pdf", "application/pdf", largeContent);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE));
    }

    // ─── 빈 파일 ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("빈 파일 업로드 시 EMPLOYMENT_FILE_INVALID를 반환한다")
    void upload_빈_파일_EMPLOYMENT_FILE_INVALID() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> adapter.upload(emptyFile))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }

    // ─── 비PDF 확장자 ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("비PDF 확장자 파일 업로드 시 EMPLOYMENT_FILE_UNSUPPORTED를 반환한다")
    void upload_비PDF_확장자_EMPLOYMENT_FILE_UNSUPPORTED() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "document.jpg", "image/jpeg", MINIMAL_PDF);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED));
    }

    // ─── Tika MIME 검증 — PDF 확장자지만 실제 내용이 PDF 아님 ────────────────────────

    @Test
    @DisplayName("PDF 확장자지만 실제 내용이 PDF가 아닌 경우 EMPLOYMENT_FILE_UNSUPPORTED를 반환한다")
    void upload_비PDF_내용_EMPLOYMENT_FILE_UNSUPPORTED() {
        byte[] textContent = "This is plain text, not a PDF.".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.pdf", "application/pdf", textContent);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED));
    }

    // ─── validate — 최소 길이 미만 fileId 거부 ────────────────────────────────────────

    @Test
    @DisplayName("8자 미만 fileId는 validate에서 EMPLOYMENT_FILE_INVALID를 반환한다")
    void validate_짧은_fileId_EMPLOYMENT_FILE_INVALID() {
        assertThatThrownBy(() -> adapter.validate("short"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }

    // ─── consume() — 소비 후 재사용 차단 ─────────────────────────────────────────────

    @Test
    @DisplayName("consume() 후 동일 fileId로 validate() 호출 시 EMPLOYMENT_FILE_INVALID를 반환한다")
    void validate_소비된_fileId_EMPLOYMENT_FILE_INVALID() {
        String fileId = "stub-already-used-file-id";
        adapter.consume(fileId);

        assertThatThrownBy(() -> adapter.validate(fileId))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }

    @Test
    @DisplayName("consume()되지 않은 유효한 fileId는 validate()를 통과한다")
    void validate_미소비_fileId_통과() {
        String fileId = "stub-valid-file-id-not-consumed";
        adapter.validate(fileId); // 예외 없이 통과
    }
}
