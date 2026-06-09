package kr.co.carrer.global.s3;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class S3Uploader {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    /**
     * 이력서 파일을 S3에 업로드하고 파일 URL을 반환한다.
     * S3 키 형식: resumes/{yyyy-MM-dd}/{UUID}.{확장자}
     */
    public String upload(MultipartFile file, String extension) {
        String s3Key = buildS3Key(extension);

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new RuntimeException("S3 업로드 중 파일 읽기 실패: " + e.getMessage(), e);
        }

        return buildFileUrl(s3Key);
    }

    private String buildS3Key(String extension) {
        String date = LocalDate.now().toString();
        String uuid = UUID.randomUUID().toString();
        return String.format("resumes/%s/%s.%s", date, uuid, extension);
    }

    private String buildFileUrl(String s3Key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
    }
}
