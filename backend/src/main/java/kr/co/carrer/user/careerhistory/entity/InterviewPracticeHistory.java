package kr.co.carrer.user.careerhistory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import kr.co.carrer.user.careerhistory.type.InterviewType;

@Entity
@Table(name = "interview_practice_history")
public class InterviewPracticeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long careerHistoryId;

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

    public InterviewPracticeHistory(
            Long careerHistoryId,
            InterviewType interviewType,
            String script,
            String question,
            String answer,
            String highlightedIssue,
            String feedback
    ) {
        this.careerHistoryId = careerHistoryId;
        this.interviewType = interviewType;
        this.script = script;
        this.question = question;
        this.answer = answer;
        this.highlightedIssue = highlightedIssue;
        this.feedback = feedback;
    }

    public Long getId() {
        return id;
    }

    public Long getCareerHistoryId() {
        return careerHistoryId;
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
