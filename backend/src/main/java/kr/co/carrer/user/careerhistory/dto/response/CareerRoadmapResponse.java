package kr.co.carrer.user.careerhistory.dto.response;

import kr.co.carrer.user.careerhistory.entity.CareerRoadmap;

public record CareerRoadmapResponse(
        Long id,
        Long userId,
        Integer step,
        String title,
        String description,
        String recommendedActions,
        String targetSkill
) {
    public static CareerRoadmapResponse from(CareerRoadmap roadmap) {
        return new CareerRoadmapResponse(
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
