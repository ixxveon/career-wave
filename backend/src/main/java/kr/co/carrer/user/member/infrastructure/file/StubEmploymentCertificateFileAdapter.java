package kr.co.carrer.user.member.infrastructure.file;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.EmploymentCertificateFilePort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * 재직증명서 fileId 검증 stub — Phase 5에서 실제 S3 연동 구현체로 교체.
 * 현재: null/blank 및 최소 길이 형식 검증만 수행.
 */
@Profile({"local", "test"})
@Component
public class StubEmploymentCertificateFileAdapter implements EmploymentCertificateFilePort {

    private static final int MIN_FILE_ID_LENGTH = 8;

    @Value("${aws.s3.bucket-name:careerwave-local}")
    private String bucketName;

    @Override
    public void validate(String fileId) {
        if (fileId == null || fileId.isBlank() || fileId.length() < MIN_FILE_ID_LENGTH) {
            throw new CustomException(UserAuthErrorCode.EMPLOYMENT_FILE_INVALID);
        }
        // TODO Phase 5: S3 객체 존재 여부 · PDF MIME · 5MB 이하 검증으로 교체
    }

    @Override
    public String resolveUrl(String fileId) {
        return "https://s3.ap-northeast-2.amazonaws.com/" + bucketName + "/" + fileId;
    }

    @Override
    public String resolveFileName(String fileId) {
        return fileId;
    }
}
