package kr.co.carrer.user.careerhistory.dto;

import kr.co.carrer.user.careerhistory.entity.CareerHistoryRecord;
import kr.co.carrer.user.careerhistory.type.ActivityType;
import kr.co.carrer.user.careerhistory.type.CareerHistoryStatus;

public record CareerHistoryResponseDto(
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
    public static CareerHistoryResponseDto from(CareerHistoryRecord record) {
        return new CareerHistoryResponseDto(
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
