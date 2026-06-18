package kr.co.carrer.user.member.infrastructure.file;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;

/**
 * 재직증명서 fileId 검증 stub — local/test 전용.
 * 실 환경에서는 S3EmploymentCertificateFileAdapter 사용.
 */
@Profile({"local", "test"})
@Component
public class StubEmploymentCertificateFileAdapter implements EmploymentCertificateFilePort {

    private static final int MIN_FILE_ID_LENGTH = 8;
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    @Value("${aws.s3.bucket-name:careerwave-local}")
    private String bucketName;

    @Override
    public void validate(String fileId) {
        if (fileId == null || fileId.isBlank() || fileId.length() < MIN_FILE_ID_LENGTH) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }
    }

    @Override
    public String resolveUrl(String fileId) {
        return "https://s3.ap-northeast-2.amazonaws.com/" + bucketName + "/" + fileId;
    }

    @Override
    public String resolveFileName(String fileId) {
        return fileId;
    }

    @Override
    public UserRegisterDto.ResponseEmploymentCertificateUpload upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_TOO_LARGE);
        }
        String fakeFileId = "stub-" + UUID.randomUUID();
        return new UserRegisterDto.ResponseEmploymentCertificateUpload(
                fakeFileId,
                file.getOriginalFilename(),
                "application/pdf",
                file.getSize(),
                Instant.now()
        );
    }
}
