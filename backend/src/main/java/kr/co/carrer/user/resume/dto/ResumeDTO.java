package kr.co.carrer.user.resume.dto;

import java.time.ZonedDateTime;
import java.util.UUID;

public class ResumeDTO {

    // 이력서 업로드 응답
    public record ResponseUpload(
            UUID documentId,
            String status,
            String fileUrl,
            String originalName,
            String fileType,
            ZonedDateTime createdAt
    ) {}
}
