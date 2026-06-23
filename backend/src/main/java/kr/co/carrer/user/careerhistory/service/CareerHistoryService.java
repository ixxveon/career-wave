package kr.co.carrer.user.careerhistory.service;

import kr.co.carrer.user.careerhistory.dto.CareerCompetencyReportResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerHistoryDetailResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerHistoryResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerRoadmapResponseDto;

import java.util.List;

public interface CareerHistoryService {

    List<CareerHistoryResponseDto> getHistories(Long userId);

    CareerHistoryDetailResponseDto getHistoryDetail(Long userId, Long historyId);

    CareerCompetencyReportResponseDto getCompetencyReport(Long userId);

    List<CareerRoadmapResponseDto> getRoadmap(Long userId);
}