package kr.co.carrer.user.careerhistory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "career_roadmap")
public class CareerRoadmap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private Integer step;

    private String title;

    @Column(length = 2000)
    private String description;

    @Column(length = 2000)
    private String recommendedActions;

    private String targetSkill;

    protected CareerRoadmap() {
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getStep() {
        return step;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getRecommendedActions() {
        return recommendedActions;
    }

    public String getTargetSkill() {
        return targetSkill;
    }
}
