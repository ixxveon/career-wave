package kr.co.carrer.user.resume.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.resume.exception.ResumeErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;

@Slf4j
@Component
public class FileValidator {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024L; // 10MB
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx");

    private final Tika tika = new Tika();

    public void validate(MultipartFile file) {
        validateFileSize(file);
        validateExtension(file);
        validateMimeType(file);
    }

    public String extractExtension(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        if (originalName == null || !originalName.contains(".")) {
            throw new CustomException(ResumeErrorCode.INVALID_FILE_TYPE);
        }
        return originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
    }

    private void validateExtension(MultipartFile file) {
        String extension = extractExtension(file);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new CustomException(ResumeErrorCode.INVALID_FILE_TYPE);
        }
    }

    private void validateFileSize(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ResumeErrorCode.INVALID_FILE_SIZE);
        }
    }

    private void validateMimeType(MultipartFile file) {
        try (var in = file.getInputStream()) {
            String detectedMime = tika.detect(in);
            if (!ALLOWED_MIME_TYPES.contains(detectedMime)) {
                log.warn("[파일 검증 실패] 허용되지 않는 MIME type: {}, 파일명: {}", detectedMime, file.getOriginalFilename());
                throw new CustomException(ResumeErrorCode.INVALID_FILE_TYPE);
            }
        } catch (IOException e) {
            log.error("[파일 검증 실패] MIME type 감지 중 오류: {}", e.getMessage());
            throw new CustomException(ResumeErrorCode.INVALID_FILE_TYPE);
        }
    }
}
