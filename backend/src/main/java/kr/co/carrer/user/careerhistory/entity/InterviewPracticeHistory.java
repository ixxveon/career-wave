package kr.co.carrer.user.careerhistory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import kr.co.carrer.user.careerhistory.type.InterviewType;

@Entity
@Table(name = "interview_practice_history")
public class InterviewPracticeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "career_history_id", nullable = false)
    private CareerHistoryRecord careerHistory;

    @Enumerated(EnumType.STRING)
    private InterviewType interviewType;

    @Column(length = 5000)
    private String script;

    @Column(length = 1000)
    private String question;

    @Column(length = 3000)
    private String answer;

    @Column(length = 2000)
    private String highlightedIssue;

    @Column(length = 3000)
    private String feedback;

    protected InterviewPracticeHistory() {
    }

    public Long getId() {
        return id;
    }

    public Long getCareerHistoryId() {
        return careerHistory.getId();
    }

    public CareerHistoryRecord getCareerHistory() {
        return careerHistory;
    }

    public InterviewType getInterviewType() {
        return interviewType;
    }

    public String getScript() {
        return script;
    }

    public String getQuestion() {
        return question;
    }

    public String getAnswer() {
        return answer;
    }

    public String getHighlightedIssue() {
        return highlightedIssue;
    }

    public String getFeedback() {
        return feedback;
    }
}
