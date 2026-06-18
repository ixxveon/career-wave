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
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
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

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            log.error("[재직증명서 업로드] 파일 읽기 실패: {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }

        String mimeType = tika.detect(bytes);
        if (!ALLOWED_MIME.equals(mimeType)) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_UNSUPPORTED);
        }

        String s3Key = buildS3Key();
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "certificate.pdf";

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(ALLOWED_MIME)
                .contentLength((long) bytes.length)
                .metadata(Map.of(META_ORIGINAL_NAME, originalName))
                .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(bytes));
        log.info("[재직증명서 업로드] 성공 — key: {}", s3Key);

        return new UserRegisterDto.ResponseEmploymentCertificateUpload(
                s3Key,
                originalName,
                ALLOWED_MIME,
                file.getSize(),
                Instant.now()
        );
    }

    @Override
    public void validate(String fileId) {
        try {
            s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileId)
                    .build());
        } catch (NoSuchKeyException e) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
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
        } catch (NoSuchKeyException e) {
            return fileId;
        }
    }

    private String buildS3Key() {
        return String.format("%s/%s/%s.pdf", KEY_PREFIX, LocalDate.now(), UUID.randomUUID());
    }
}
