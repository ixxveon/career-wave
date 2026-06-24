package kr.co.carrer.user.careerhistory.dto.response;

import kr.co.carrer.user.careerhistory.entity.CareerHistoryRecord;
import kr.co.carrer.user.careerhistory.entity.InterviewPracticeHistory;
import kr.co.carrer.user.careerhistory.type.ActivityType;
import kr.co.carrer.user.careerhistory.type.CareerHistoryStatus;

import java.util.List;

public record CareerHistoryDetailResponse(
        Long id,
        Long userId,
        String companyName,
        ActivityType activityType,
        String title,
        String practiceDate,
        CareerHistoryStatus status,
        Integer score,
        String summary,
        List<InterviewPracticeHistoryResponse> interviewHistories
) {
    public static CareerHistoryDetailResponse from(
            CareerHistoryRecord record,
            List<InterviewPracticeHistory> interviewHistories
    ) {
        return new CareerHistoryDetailResponse(
                record.getId(),
                record.getUserId(),
                record.getCompanyName(),
                record.getActivityType(),
                record.getTitle(),
                record.getPracticeDate(),
                record.getStatus(),
                record.getScore(),
                record.getSummary(),
                interviewHistories.stream()
                        .map(InterviewPracticeHistoryResponse::from)
                        .toList()
        );
    }
}