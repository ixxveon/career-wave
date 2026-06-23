package kr.co.carrer.user.careerhistory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import kr.co.carrer.user.careerhistory.type.ActivityType;
import kr.co.carrer.user.careerhistory.type.CareerHistoryStatus;

@Entity
@Table(name = "career_history")
public class CareerHistoryRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String companyName;

    @Enumerated(EnumType.STRING)
    private ActivityType activityType;

    private String title;

    private String practiceDate;

    @Enumerated(EnumType.STRING)
    private CareerHistoryStatus status;

    private Integer score;

    @Column(length = 2000)
    private String summary;

    protected CareerHistoryRecord() {
    }

    public CareerHistoryRecord(
            Long userId,
            String companyName,
            ActivityType activityType,
            String title,
            String practiceDate,
            CareerHistoryStatus status,
            Integer score,
            String summary
    ) {
        this.userId = userId;
        this.companyName = companyName;
        this.activityType = activityType;
        this.title = title;
        this.practiceDate = practiceDate;
        this.status = status;
        this.score = score;
        this.summary = summary;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public ActivityType getActivityType() {
        return activityType;
    }

    public String getTitle() {
        return title;
    }

    public String getPracticeDate() {
        return practiceDate;
    }

    public CareerHistoryStatus getStatus() {
        return status;
    }

    public Integer getScore() {
        return score;
    }

    public String getSummary() {
        return summary;
    }
}
