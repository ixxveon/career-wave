package kr.co.carrer.global.s3;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Component
public class S3Uploader {

    @Autowired(required = false)
    private S3Client s3Client;

    @Autowired(required = false)
    private S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name:mock-bucket}")
    private String bucketName;

    @Value("${aws.s3.mock-upload:false}")
    private boolean mockUpload;

    @Value("${aws.s3.presigned-url-expiration-minutes:10}")
    private long presignedUrlExpirationMinutes;

    public String upload(MultipartFile file, String extension) {
        String s3Key = buildS3Key(extension);
        return uploadToKey(file, s3Key);
    }

    public String uploadToKey(MultipartFile file, String s3Key) {
        if (s3Key == null || s3Key.isBlank()) {
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
        }

        if (mockUpload) {
            try {
                String fileName = Paths.get(s3Key.replace("\\", "/")).getFileName().toString();
                Path dir = Paths.get(System.getProperty("java.io.tmpdir"), "career-wave-mock-files");
                Files.createDirectories(dir);
                Files.write(dir.resolve(fileName), file.getBytes());
                log.warn("[S3 Mock] local save - {}", dir.resolve(fileName));
                return "http://localhost:8080/mock-files/" + fileName;
            } catch (IOException e) {
                log.error("[S3 Mock] local save failed", e);
                throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
            }
        }

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            log.error("[S3] file read failed - key: {}, error: {}", s3Key, e.getMessage());
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
        } catch (S3Exception e) {
            log.error("[S3] upload failed - key: {}, statusCode: {}, error: {}", s3Key, e.statusCode(), e.getMessage());
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
        }

        return s3Key;
    }

    public String createPresignedGetUrl(String s3Key) {
        return createPresignedGetUrl(s3Key, presignedUrlExpirationMinutes);
    }

    public String createPresignedGetUrl(String s3Key, long expirationMinutes) {
        if (s3Key == null || s3Key.isBlank()) {
            return s3Key;
        }
        if (mockUpload || isNonS3HttpUrl(s3Key)) {
            return s3Key;
        }

        String objectKey = toObjectKey(s3Key);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    private boolean isNonS3HttpUrl(String value) {
        return isHttpUrl(value) && !isLegacyBucketUrl(value);
    }

    private boolean isHttpUrl(String value) {
        return value.startsWith("http://") || value.startsWith("https://");
    }

    private boolean isLegacyBucketUrl(String value) {
        try {
            URI uri = new URI(value);
            String host = uri.getHost();
            return host != null && host.equals(bucketName + ".s3." + uriHostRegion(host) + ".amazonaws.com");
        } catch (URISyntaxException e) {
            return false;
        }
    }

    private String uriHostRegion(String host) {
        String prefix = bucketName + ".s3.";
        String suffix = ".amazonaws.com";
        if (!host.startsWith(prefix) || !host.endsWith(suffix)) {
            return "";
        }
        return host.substring(prefix.length(), host.length() - suffix.length());
    }

    private String toObjectKey(String value) {
        if (!isLegacyBucketUrl(value)) {
            return value;
        }
        try {
            String path = new URI(value).getPath();
            return path != null && path.startsWith("/") ? path.substring(1) : path;
        } catch (URISyntaxException e) {
            return value;
        }
    }

    private String buildS3Key(String extension) {
        String date = LocalDate.now().toString();
        String uuid = UUID.randomUUID().toString();
        return String.format("resumes/%s/%s.%s", date, uuid, extension);
    }
}
