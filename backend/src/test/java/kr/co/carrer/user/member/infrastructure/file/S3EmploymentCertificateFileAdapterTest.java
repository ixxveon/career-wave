package kr.co.carrer.user.member.infrastructure.file;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class S3EmploymentCertificateFileAdapterTest {

    private S3Client s3Client;
    private S3EmploymentCertificateFileAdapter adapter;

    // 최소 유효 PDF 바이트 — Tika가 application/pdf로 감지하는 최소 구조
    private static final byte[] MINIMAL_PDF_BYTES =
            "%PDF-1.0\n1 0 obj<</Type/Catalog>>endobj\n%%EOF".getBytes();

    @BeforeEach
    void setUp() throws Exception {
        s3Client = mock(S3Client.class);
        adapter = new S3EmploymentCertificateFileAdapter(s3Client);
        setField(adapter, "bucketName", "test-bucket");
        setField(adapter, "region", "ap-northeast-2");
    }

    // ─── upload 성공 ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("유효한 PDF 업로드 시 fileId와 메타데이터를 반환한다")
    void upload_성공_fileId_반환() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        MockMultipartFile file = new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", MINIMAL_PDF_BYTES);

        UserRegisterDto.ResponseEmploymentCertificateUpload result = adapter.upload(file);

        assertThat(result.fileId()).startsWith("employment-certificates/");
        assertThat(result.fileId()).endsWith(".pdf");
        assertThat(result.originalName()).isEqualTo("certificate.pdf");
        assertThat(result.mimeType()).isEqualTo("application/pdf");
        assertThat(result.uploadedAt()).isNotNull();
        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    // ─── upload — 확장자 오류 ───────────────────────────────────────────────────────

    @Test
    @DisplayName("비PDF 확장자 파일 업로드 시 EMPLOYMENT_FILE_UNSUPPORTED를 반환한다")
    void upload_비PDF_확장자_EMPLOYMENT_FILE_UNSUPPORTED() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "malware.exe", "application/pdf", MINIMAL_PDF_BYTES);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED));

        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    // ─── upload — MIME 오류 ────────────────────────────────────────────────────────

    @Test
    @DisplayName("PDF 확장자지만 내용이 PDF가 아닌 경우 EMPLOYMENT_FILE_UNSUPPORTED를 반환한다")
    void upload_비PDF_내용_EMPLOYMENT_FILE_UNSUPPORTED() {
        byte[] textBytes = "This is plain text content, not a PDF.".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.pdf", "application/pdf", textBytes);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED));
    }

    // ─── upload — 크기 초과 ────────────────────────────────────────────────────────

    @Test
    @DisplayName("5MB 초과 파일 업로드 시 EMPLOYMENT_FILE_TOO_LARGE를 반환한다")
    void upload_5MB초과_EMPLOYMENT_FILE_TOO_LARGE() {
        byte[] largeContent = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.pdf", "application/pdf", largeContent);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE));
    }

    // ─── upload — S3 예외 ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("S3 업로드 실패 시 SdkException이 EMPLOYMENT_FILE_INVALID로 변환된다")
    void upload_S3Exception_EMPLOYMENT_FILE_INVALID() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(SdkException.create("S3 error", new RuntimeException()));

        MockMultipartFile file = new MockMultipartFile(
                "file", "certificate.pdf", "application/pdf", MINIMAL_PDF_BYTES);

        assertThatThrownBy(() -> adapter.upload(file))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }

    // ─── validate 성공 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("유효한 S3 PDF 객체 fileId 검증 시 예외가 발생하지 않는다")
    void validate_성공() {
        String fileId = "employment-certificates/2026-06-18/uuid.pdf";
        HeadObjectResponse headResponse = HeadObjectResponse.builder()
                .contentType("application/pdf")
                .contentLength(1024L)
                .build();

        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(headResponse);

        adapter.validate(fileId);  // 예외 없이 통과
    }

    // ─── validate — prefix 오류 ───────────────────────────────────────────────────

    @Test
    @DisplayName("employment-certificates/ 외 prefix의 fileId는 EMPLOYMENT_FILE_INVALID를 반환한다")
    void validate_prefix_오류_EMPLOYMENT_FILE_INVALID() {
        assertThatThrownBy(() -> adapter.validate("resumes/2026/uuid.pdf"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));

        verify(s3Client, never()).headObject(any(HeadObjectRequest.class));
    }

    // ─── validate — 객체 미존재 ───────────────────────────────────────────────────

    @Test
    @DisplayName("S3에 존재하지 않는 fileId는 EMPLOYMENT_FILE_INVALID를 반환한다")
    void validate_NoSuchKey_EMPLOYMENT_FILE_INVALID() {
        when(s3Client.headObject(any(HeadObjectRequest.class)))
                .thenThrow(NoSuchKeyException.builder().build());

        assertThatThrownBy(() -> adapter.validate("employment-certificates/2026/missing.pdf"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }

    // ─── validate — contentType 오류 ──────────────────────────────────────────────

    @Test
    @DisplayName("S3 객체의 contentType이 PDF가 아닌 경우 EMPLOYMENT_FILE_UNSUPPORTED를 반환한다")
    void validate_비PDF_contentType_EMPLOYMENT_FILE_UNSUPPORTED() {
        HeadObjectResponse headResponse = HeadObjectResponse.builder()
                .contentType("image/png")
                .contentLength(1024L)
                .build();
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(headResponse);

        assertThatThrownBy(() -> adapter.validate("employment-certificates/2026/image.pdf"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED));
    }

    // ─── validate — 크기 초과 ────────────────────────────────────────────────────

    @Test
    @DisplayName("S3 객체의 크기가 5MB를 초과하는 경우 EMPLOYMENT_FILE_TOO_LARGE를 반환한다")
    void validate_크기초과_EMPLOYMENT_FILE_TOO_LARGE() {
        HeadObjectResponse headResponse = HeadObjectResponse.builder()
                .contentType("application/pdf")
                .contentLength(5L * 1024 * 1024 + 1)
                .build();
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(headResponse);

        assertThatThrownBy(() -> adapter.validate("employment-certificates/2026/large.pdf"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE));
    }

    // ─── validate — S3 예외 ───────────────────────────────────────────────────────

    @Test
    @DisplayName("S3 headObject 실패 시(403/네트워크 등) EMPLOYMENT_FILE_INVALID를 반환한다")
    void validate_SdkException_EMPLOYMENT_FILE_INVALID() {
        when(s3Client.headObject(any(HeadObjectRequest.class)))
                .thenThrow(SdkException.create("403 Forbidden", new RuntimeException()));

        assertThatThrownBy(() -> adapter.validate("employment-certificates/2026/uuid.pdf"))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode())
                                .isEqualTo(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID));
    }

    // ─── resolveFileName ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("S3 메타데이터에서 원본 파일명을 반환한다")
    void resolveFileName_메타데이터에서_반환() {
        HeadObjectResponse headResponse = HeadObjectResponse.builder()
                .metadata(Map.of("original-name", "my_certificate.pdf"))
                .build();
        when(s3Client.headObject(any(HeadObjectRequest.class))).thenReturn(headResponse);

        String result = adapter.resolveFileName("employment-certificates/2026/uuid.pdf");

        assertThat(result).isEqualTo("my_certificate.pdf");
    }

    @Test
    @DisplayName("S3 headObject 실패 시 fileId를 폴백으로 반환한다")
    void resolveFileName_S3예외_폴백() {
        when(s3Client.headObject(any(HeadObjectRequest.class)))
                .thenThrow(SdkException.create("error", new RuntimeException()));

        String fileId = "employment-certificates/2026/uuid.pdf";
        String result = adapter.resolveFileName(fileId);

        assertThat(result).isEqualTo(fileId);
    }

    // ─── 내부 유틸 ───────────────────────────────────────────────────────────────

    private void setField(Object target, String name, Object value) throws Exception {
        Class<?> clazz = target.getClass();
        while (clazz != null) {
            try {
                Field field = clazz.getDeclaredField(name);
                field.setAccessible(true);
                field.set(target, value);
                return;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }
}
