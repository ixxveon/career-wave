package kr.co.carrer.user.member.infrastructure.file;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Profile("!local & !test")
@Component
@RequiredArgsConstructor
public class S3EmploymentCertificateFileAdapter implements EmploymentCertificateFilePort {

    private static final String KEY_PREFIX = "employment-certificates";
    private static final String ALLOWED_MIME = "application/pdf";
    private static final String ALLOWED_EXTENSION = ".pdf";
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final String META_ORIGINAL_NAME = "original-name";

    private final S3Client s3Client;
    private final Tika tika = new Tika();

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region:ap-northeast-2}")
    private String region;

    @Override
    public UserRegisterDto.ResponseEmploymentCertificateUpload upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE);
        }

        // 확장자 검증 — tasks.md §194 요구사항
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        if (!originalName.toLowerCase().endsWith(ALLOWED_EXTENSION)) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED);
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            log.error("[재직증명서 업로드] 파일 읽기 실패: {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }

        // Tika MIME 검증 — 확장자 위조 방어
        String detectedMime = tika.detect(bytes);
        if (!ALLOWED_MIME.equals(detectedMime)) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED);
        }

        String s3Key = buildS3Key();
        String safeOriginalName = originalName.isBlank() ? "certificate.pdf" : originalName;

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(ALLOWED_MIME)
                .contentLength((long) bytes.length)
                .metadata(Map.of(META_ORIGINAL_NAME, safeOriginalName))
                .build();

        try {
            s3Client.putObject(putRequest, RequestBody.fromBytes(bytes));
        } catch (SdkException e) {
            log.error("[재직증명서 업로드] S3 업로드 실패 — key: {}, error: {}", s3Key, e.getMessage());
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }

        log.info("[재직증명서 업로드] 성공 — key: {}", s3Key);

        return new UserRegisterDto.ResponseEmploymentCertificateUpload(
                s3Key,
                safeOriginalName,
                ALLOWED_MIME,
                file.getSize(),
                Instant.now()
        );
    }

    @Override
    public void validate(String fileId) {
        // fileId는 upload()가 생성한 S3 key — prefix 검증으로 임의 key 우회 차단
        if (fileId == null || !fileId.startsWith(KEY_PREFIX + "/")) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }

        HeadObjectResponse headResponse;
        try {
            headResponse = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileId)
                    .build());
        } catch (NoSuchKeyException e) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        } catch (SdkException e) {
            log.error("[재직증명서 검증] S3 headObject 실패 — key: {}, error: {}", fileId, e.getMessage());
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }

        // contentType 검증 — S3에 저장된 메타데이터 기준
        String contentType = headResponse.contentType();
        if (!ALLOWED_MIME.equals(contentType)) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED);
        }

        // 크기 검증 — 업로드 시점 이후 변경 가능성 방어
        Long contentLength = headResponse.contentLength();
        if (contentLength != null && contentLength > MAX_FILE_SIZE) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE);
        }
    }

    @Override
    public String resolveUrl(String fileId) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, fileId);
    }

    @Override
    public String resolveFileName(String fileId) {
        try {
            var response = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileId)
                    .build());
            String originalName = response.metadata().get(META_ORIGINAL_NAME);
            return originalName != null ? originalName : fileId;
        } catch (SdkException e) {
            log.warn("[재직증명서 파일명 조회] S3 headObject 실패 — key: {}", fileId);
            return fileId;
        }
    }

    private String buildS3Key() {
        return String.format("%s/%s/%s.pdf", KEY_PREFIX, LocalDate.now(), UUID.randomUUID());
    }
}
