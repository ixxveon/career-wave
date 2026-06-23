package kr.co.carrer.user.careerhistory.repository;

import kr.co.carrer.user.careerhistory.entity.InterviewPracticeHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewPracticeHistoryRepository
        extends JpaRepository<InterviewPracticeHistory, Long> {

    List<InterviewPracticeHistory> findByCareerHistoryId(Long careerHistoryId);
}
