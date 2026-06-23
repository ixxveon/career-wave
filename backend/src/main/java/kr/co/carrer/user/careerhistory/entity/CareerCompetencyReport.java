package kr.co.carrer.user.careerhistory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "career_competency_report")
public class CareerCompetencyReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private Integer documentScore;

    private Integer interviewScore;

    private Integer totalScore;

    @Column(length = 2000)
    private String weaknesses;

    @Column(length = 2000)
    private String priorityTargets;

    @Column(length = 3000)
    private String growthTrend;

    protected CareerCompetencyReport() {
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getDocumentScore() {
        return documentScore;
    }

    public Integer getInterviewScore() {
        return interviewScore;
    }

    public Integer getTotalScore() {
        return totalScore;
    }

    public String getWeaknesses() {
        return weaknesses;
    }

    public String getPriorityTargets() {
        return priorityTargets;
    }

    public String getGrowthTrend() {
        return growthTrend;
    }
}
