package kr.co.carrer.user.careerhistory.repository;

import kr.co.carrer.user.careerhistory.entity.CareerHistoryRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CareerHistoryRecordRepository extends JpaRepository<CareerHistoryRecord, Long> {

    List<CareerHistoryRecord> findByUserId(Long userId);

    List<CareerHistoryRecord> findByUserIdAndCompanyNameContaining(Long userId, String companyName);

    List<CareerHistoryRecord> findByUserIdAndPracticeDate(Long userId, String practiceDate);
}
