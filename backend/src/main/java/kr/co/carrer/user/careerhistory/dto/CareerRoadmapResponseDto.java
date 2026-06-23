package kr.co.carrer.user.careerhistory.dto;

import kr.co.carrer.user.careerhistory.entity.CareerRoadmap;

public record CareerRoadmapResponseDto(
        Long id,
        Long userId,
        Integer step,
        String title,
        String description,
        String recommendedActions,
        String targetSkill
) {
    public static CareerRoadmapResponseDto from(CareerRoadmap roadmap) {
        return new CareerRoadmapResponseDto(
                roadmap.getId(),
                roadmap.getUserId(),
                roadmap.getStep(),
                roadmap.getTitle(),
                roadmap.getDescription(),
                roadmap.getRecommendedActions(),
                roadmap.getTargetSkill()
        );
    }
}
