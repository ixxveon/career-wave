package kr.co.carrer.user.careerhistory.service;

import kr.co.carrer.user.careerhistory.dto.CareerCompetencyReportResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerHistoryDetailResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerHistoryResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerRoadmapResponseDto;
import kr.co.carrer.user.careerhistory.entity.CareerHistoryRecord;
import kr.co.carrer.user.careerhistory.repository.CareerCompetencyReportRepository;
import kr.co.carrer.user.careerhistory.repository.CareerHistoryRecordRepository;
import kr.co.carrer.user.careerhistory.repository.CareerRoadmapRepository;
import kr.co.carrer.user.careerhistory.repository.InterviewPracticeHistoryRepository;
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
    public List<CareerHistoryResponseDto> getHistories(Long userId) {
        return careerHistoryRecordRepository.findByUserId(userId)
                .stream()
                .map(CareerHistoryResponseDto::from)
                .toList();
    }

    @Override
    public CareerHistoryDetailResponseDto getHistoryDetail(Long userId, Long historyId) {
        CareerHistoryRecord record = careerHistoryRecordRepository.findById(historyId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 취업 준비 기록입니다."));

        if (!record.getUserId().equals(userId)) {
            throw new IllegalArgumentException("해당 취업 준비 기록에 접근할 수 없습니다.");
        }

        return CareerHistoryDetailResponseDto.from(
                record,
                interviewPracticeHistoryRepository.findByCareerHistoryId(historyId)
        );
    }

    @Override
    public CareerCompetencyReportResponseDto getCompetencyReport(Long userId) {
        return careerCompetencyReportRepository.findByUserId(userId)
                .map(CareerCompetencyReportResponseDto::from)
                .orElseThrow(() -> new IllegalArgumentException("역량 평가 데이터가 존재하지 않습니다."));
    }

    @Override
    public List<CareerRoadmapResponseDto> getRoadmap(Long userId) {
        return careerRoadmapRepository.findByUserIdOrderByStepAsc(userId)
                .stream()
                .map(CareerRoadmapResponseDto::from)
                .toList();
    }
}
