package kr.co.carrer.user.interview.repository.projection;

import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.interview.type.ReportStatus;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;

import java.time.ZonedDateTime;
import java.util.UUID;

public interface CareerHistoryWithSession {
    Long getCareerHistoryId();
    UUID getSessionId();
    SessionType getSessionType();
    InterviewType getInterviewType();
    String getTargetCompany();
    SessionStatus getSessionStatus();
    ReportStatus getReportStatus();
    Integer getTotalScore();
    String getPdfUrl();
    ZonedDateTime getCreatedAt();
}
