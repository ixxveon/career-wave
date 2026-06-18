package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserRegisterDto;
import org.springframework.web.multipart.MultipartFile;

public interface EmploymentCertificateFilePort {

    /**
     * fileId 유효성 검증 — 유효하지 않으면 CustomException(EMPLOYMENT_FILE_INVALID) throw.
     * S3 구현체에서 객체 존재 여부·MIME·크기 검증.
     */
    void validate(String fileId);

    /** fileId → 최종 저장 URL 변환 */
    String resolveUrl(String fileId);

    /** fileId → 원본 파일명 변환 */
    String resolveFileName(String fileId);

    /** PDF 파일 업로드 후 fileId 및 메타데이터 반환 */
    UserRegisterDto.ResponseEmploymentCertificateUpload upload(MultipartFile file);

    /**
     * 기업 가입 완료 후 fileId를 소비 처리한다.
     * 소비된 fileId는 validate()에서 거부되어 재사용을 방지한다.
     */
    void consume(String fileId);
}
