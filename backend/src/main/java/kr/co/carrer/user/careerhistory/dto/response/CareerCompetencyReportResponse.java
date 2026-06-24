package kr.co.carrer.user.careerhistory.dto.response;

import kr.co.carrer.user.careerhistory.entity.CareerCompetencyReport;

public record CareerCompetencyReportResponse(
        Long id,
        Long userId,
        Integer documentScore,
        Integer interviewScore,
        Integer totalScore,
        String weaknesses,
        String priorityTargets,
        String growthTrend
) {
    public static CareerCompetencyReportResponse from(CareerCompetencyReport report) {
        return new CareerCompetencyReportResponse(
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