package kr.co.carrer.user.careerhistory.dto;

import kr.co.carrer.user.careerhistory.entity.CareerCompetencyReport;

public record CareerCompetencyReportResponseDto(
        Long id,
        Long userId,
        Integer documentScore,
        Integer interviewScore,
        Integer totalScore,
        String weaknesses,
        String priorityTargets,
        String growthTrend
) {
    public static CareerCompetencyReportResponseDto from(CareerCompetencyReport report) {
        return new CareerCompetencyReportResponseDto(
                report.getId(),
                report.getUserId(),
                report.getDocumentScore(),
                report.getInterviewScore(),
                report.getTotalScore(),
                report.getWeaknesses(),
                report.getPriorityTargets(),
                report.getGrowthTrend()
        );
    }
}