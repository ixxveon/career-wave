package kr.co.carrer.user.member.service;

public interface EmploymentCertificateFilePort {

    /**
     * fileId 유효성 검증 — 유효하지 않으면 CustomException(EMPLOYMENT_FILE_INVALID) throw.
     * Phase 5에서 실제 S3 존재 여부·MIME·크기 검증으로 교체.
     */
    void validate(String fileId);

    /** fileId → 최종 저장 URL 변환 */
    String resolveUrl(String fileId);

    /** fileId → 원본 파일명 변환 */
    String resolveFileName(String fileId);
}
