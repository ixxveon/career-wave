package kr.co.carrer.user.careerhistory.dto;

import kr.co.carrer.user.interview.entity.CareerHistory;

import java.time.ZonedDateTime;
import java.util.UUID;

public record UserCareerHistoryDetailResponse(
        Long careerHistoryId,
        UUID sessionId,
        UUID documentId,
        Integer totalScore,
        String feedback,
        String pdfUrl,
        ZonedDateTime createdAt
) {
    public static UserCareerHistoryDetailResponse from(CareerHistory history) {
        return new UserCareerHistoryDetailResponse(
                history.getCareerHistoryId(),
                history.getSessionId(),
                history.getDocumentId(),
                history.getTotalScore(),
                history.getFeedback(),
                history.getPdfUrl(),
                history.getCreatedAt()
        );
    }
}
