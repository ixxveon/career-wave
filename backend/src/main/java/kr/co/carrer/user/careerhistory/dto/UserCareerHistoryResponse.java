package kr.co.carrer.user.careerhistory.dto;

import kr.co.carrer.user.interview.repository.projection.CareerHistoryWithSession;

import java.time.ZonedDateTime;
import java.util.UUID;

public record UserCareerHistoryResponse(
        Long careerHistoryId,
        UUID sessionId,
        String sessionType,
        String interviewType,
        String targetCompany,
        String sessionStatus,
        Integer totalScore,
        String pdfUrl,
        ZonedDateTime createdAt
) {
    public static UserCareerHistoryResponse from(CareerHistoryWithSession row) {
        return new UserCareerHistoryResponse(
                row.getCareerHistoryId(),
                row.getSessionId(),
                row.getSessionType() != null ? row.getSessionType().name() : null,
                row.getInterviewType() != null ? row.getInterviewType().name() : null,
                row.getTargetCompany(),
                row.getSessionStatus() != null ? row.getSessionStatus().name() : null,
                row.getTotalScore(),
                row.getPdfUrl(),
                row.getCreatedAt()
        );
    }
}
