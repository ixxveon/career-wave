package kr.co.carrer.user.careerhistory.dto.response;

import kr.co.carrer.user.careerhistory.entity.CareerHistoryRecord;
import kr.co.carrer.user.careerhistory.type.ActivityType;
import kr.co.carrer.user.careerhistory.type.CareerHistoryStatus;

public record CareerHistoryResponse(
        Long id,
        Long userId,
        String companyName,
        ActivityType activityType,
        String title,
        String practiceDate,
        CareerHistoryStatus status,
        Integer score,
        String summary
) {
    public static CareerHistoryResponse from(CareerHistoryRecord record) {
        return new CareerHistoryResponse(
                record.getId(),
                record.getUserId(),
                record.getCompanyName(),
                record.getActivityType(),
                record.getTitle(),
                record.getPracticeDate(),
                record.getStatus(),
                record.getScore(),
                record.getSummary()
        );
    }
}
