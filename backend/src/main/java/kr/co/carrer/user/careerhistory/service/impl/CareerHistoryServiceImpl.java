package kr.co.carrer.user.careerhistory.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.careerhistory.dto.response.CareerCompetencyReportResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerHistoryResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerRoadmapResponse;
import kr.co.carrer.user.careerhistory.entity.CareerHistoryRecord;
import kr.co.carrer.user.careerhistory.exception.CareerHistoryErrorCode;
import kr.co.carrer.user.careerhistory.repository.CareerCompetencyReportRepository;
import kr.co.carrer.user.careerhistory.repository.CareerHistoryRecordRepository;
import kr.co.carrer.user.careerhistory.repository.CareerRoadmapRepository;
import kr.co.carrer.user.careerhistory.repository.InterviewPracticeHistoryRepository;
import kr.co.carrer.user.careerhistory.service.CareerHistoryService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CareerHistoryServiceImpl implements CareerHistoryService {

    private final CareerHistoryRecordRepository careerHistoryRecordRepository;
    private final InterviewPracticeHistoryRepository interviewPracticeHistoryRepository;
    private final CareerCompetencyReportRepository careerCompetencyReportRepository;
    private final CareerRoadmapRepository careerRoadmapRepository;

    public CareerHistoryServiceImpl(
            CareerHistoryRecordRepository careerHistoryRecordRepository,
            InterviewPracticeHistoryRepository interviewPracticeHistoryRepository,
            CareerCompetencyReportRepository careerCompetencyReportRepository,
            CareerRoadmapRepository careerRoadmapRepository
    ) {
        this.careerHistoryRecordRepository = careerHistoryRecordRepository;
        this.interviewPracticeHistoryRepository = interviewPracticeHistoryRepository;
        this.careerCompetencyReportRepository = careerCompetencyReportRepository;
        this.careerRoadmapRepository = careerRoadmapRepository;
    }

    @Override
    public List<CareerHistoryResponse> getHistories(Long userId) {
        return careerHistoryRecordRepository.findByUserId(userId)
                .stream()
                .map(CareerHistoryResponse::from)
                .toList();
    }

    @Override
    public CareerHistoryDetailResponse getHistoryDetail(Long userId, Long historyId) {
        CareerHistoryRecord record = careerHistoryRecordRepository.findById(historyId)
                .orElseThrow(() -> new CustomException(CareerHistoryErrorCode.CAREER_HISTORY_NOT_FOUND));

        if (!record.getUserId().equals(userId)) {
            throw new CustomException(CareerHistoryErrorCode.CAREER_HISTORY_ACCESS_DENIED);
        }

        return CareerHistoryDetailResponse.from(
                record,
                interviewPracticeHistoryRepository.findByCareerHistory_Id(historyId)
        );
    }

    @Override
    public CareerCompetencyReportResponse getCompetencyReport(Long userId) {
        return careerCompetencyReportRepository.findByUserId(userId)
                .map(CareerCompetencyReportResponse::from)
                .orElseThrow(() -> new CustomException(CareerHistoryErrorCode.CAREER_COMPETENCY_REPORT_NOT_FOUND));
    }

    @Override
    public List<CareerRoadmapResponse> getRoadmap(Long userId) {
        return careerRoadmapRepository.findByUserIdOrderByStepAsc(userId)
                .stream()
                .map(CareerRoadmapResponse::from)
                .toList();
    }
}
