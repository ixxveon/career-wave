package kr.co.carrer.user.careerhistory.service;

import kr.co.carrer.user.careerhistory.dto.response.CareerCompetencyReportResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerHistoryResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerRoadmapResponse;

import java.util.List;

public interface CareerHistoryService {

    List<CareerHistoryResponse> getHistories(Long userId);

    CareerHistoryDetailResponse getHistoryDetail(Long userId, Long historyId);

    CareerCompetencyReportResponse getCompetencyReport(Long userId);

    List<CareerRoadmapResponse> getRoadmap(Long userId);
}