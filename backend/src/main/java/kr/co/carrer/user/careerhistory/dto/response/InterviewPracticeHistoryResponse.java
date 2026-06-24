package kr.co.carrer.user.careerhistory.dto.response;

import kr.co.carrer.user.careerhistory.entity.InterviewPracticeHistory;
import kr.co.carrer.user.careerhistory.type.InterviewType;

public record InterviewPracticeHistoryResponse(
        Long id,
        Long careerHistoryId,
        InterviewType interviewType,
        String script,
        String question,
        String answer,
        String highlightedIssue,
        String feedback
) {
    public static InterviewPracticeHistoryResponse from(InterviewPracticeHistory history) {
        return new InterviewPracticeHistoryResponse(
                history.getId(),
                history.getCareerHistoryId(),
                history.getInterviewType(),
                history.getScript(),
                history.getQuestion(),
                history.getAnswer(),
                history.getHighlightedIssue(),
                history.getFeedback()
        );
    }
}
