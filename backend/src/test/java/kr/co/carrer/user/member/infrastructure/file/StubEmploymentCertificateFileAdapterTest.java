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

    private StubEmploymentCertificateFileAdapter adapter;

    @BeforeEach
    void setUp() throws Exception {
        adapter = new StubEmploymentCertificateFileAdapter();
        // @Value 필드 직접 주입
        java.lang.reflect.Field field = StubEmploymentCertificateFileAdapter.class.getDeclaredField("bucketName");
        field.setAccessible(true);
        field.set(adapter, "careerwave-test");
    }

    // ─── 업로드 성공 — stub fileId 반환 ───────────────────────────────────────────

    @Test
    @DisplayName("정상 파일 업로드 시 stub-로 시작하는 fileId를 반환한다")
    void upload_성공_stub_fileId_반환() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", new byte[1024]);

        UserRegisterDto.ResponseEmploymentCertificateUpload result = adapter.upload(file);

        assertThat(result.fileId()).startsWith("stub-");
        assertThat(result.originalName()).isEqualTo("certificate.pdf");
        assertThat(result.mimeType()).isEqualTo("application/pdf");
        assertThat(result.size()).isEqualTo(1024);
        assertThat(result.uploadedAt()).isNotNull();
    }

    // ─── 5MB 초과 — EMPLOYMENT_FILE_TOO_LARGE ─────────────────────────────────────

    @Test
    @DisplayName("5MB를 초과하는 파일 업로드 시 EMPLOYMENT_FILE_TOO_LARGE를 반환한다")
    void upload_5MB_초과_EMPLOYMENT_FILE_TOO_LARGE() {
        byte[] largeContent = new byte[5 * 1024 * 1024 + 1]; // 5MB + 1 byte
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.pdf", "application/pdf", largeContent);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE));
    }

    // ─── 빈 파일 — EMPLOYMENT_FILE_INVALID ───────────────────────────────────────

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

    // ─── validate — 최소 길이 미만 fileId 거부 ───────────────────────────────────────

    @Test
    @DisplayName("8자 미만 fileId는 validate에서 EMPLOYMENT_FILE_INVALID를 반환한다")
    void validate_짧은_fileId_EMPLOYMENT_FILE_INVALID() {
        assertThatThrownBy(() -> adapter.validate("short"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }
}
