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
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Component
public class S3Uploader {

    // mock-upload=true 시 S3Client 빈이 존재하지 않으므로 optional 주입
    @Autowired(required = false)
    private S3Client s3Client;

    @Autowired(required = false)
    private S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name:mock-bucket}")
    private String bucketName;

    // 로컬 개발 환경에서 S3 업로드를 건너뛸지 여부 (기본값: false)
    @Value("${aws.s3.mock-upload:false}")
    private boolean mockUpload;

    @Value("${aws.s3.presigned-url-expiration-minutes:10}")
    private long presignedUrlExpirationMinutes;

    /**
     * 이력서 파일을 S3에 업로드하고 S3 key를 반환한다.
     * S3 키 형식: resumes/{yyyy-MM-dd}/{UUID}.{확장자}
     * mock-upload=true 시 실제 업로드 없이 가짜 URL 반환 (로컬 Swagger 테스트용)
     */
    public String upload(MultipartFile file, String extension) {
        String s3Key = buildS3Key(extension);

        if (mockUpload) {
            try {
                String fileName = UUID.randomUUID() + "." + extension;
                Path dir = Paths.get(System.getProperty("java.io.tmpdir"), "career-wave-mock-files");
                Files.createDirectories(dir);
                Files.write(dir.resolve(fileName), file.getBytes());
                log.warn("[S3 Mock] 로컬 저장 — {}", dir.resolve(fileName));
                return "http://localhost:8080/mock-files/" + fileName;
            } catch (IOException e) {
                log.error("[S3 Mock] 로컬 저장 실패", e);
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
            log.error("[S3] 파일 읽기 실패 — key: {}, error: {}", s3Key, e.getMessage());
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
        } catch (S3Exception e) {
            log.error("[S3] 업로드 실패 — key: {}, statusCode: {}, error: {}", s3Key, e.statusCode(), e.getMessage());
            throw new CustomException(ErrorCode.S3_UPLOAD_FAILED);
        }

        return s3Key;
    }

    public String createPresignedGetUrl(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) {
            return s3Key;
        }
        if (mockUpload || s3Key.startsWith("http://") || s3Key.startsWith("https://")) {
            return s3Key;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignedUrlExpirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    private String buildS3Key(String extension) {
        String date = LocalDate.now().toString();
        String uuid = UUID.randomUUID().toString();
        return String.format("resumes/%s/%s.%s", date, uuid, extension);
    }

}
