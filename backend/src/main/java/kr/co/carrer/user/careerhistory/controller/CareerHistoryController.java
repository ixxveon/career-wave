package kr.co.carrer.user.careerhistory.controller;

import kr.co.carrer.user.careerhistory.dto.CareerCompetencyReportResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerHistoryDetailResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerHistoryResponseDto;
import kr.co.carrer.user.careerhistory.dto.CareerRoadmapResponseDto;
import kr.co.carrer.user.careerhistory.service.CareerHistoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/user/career-histories")
public class CareerHistoryController {

    private final CareerHistoryService careerHistoryService;

    public CareerHistoryController(CareerHistoryService careerHistoryService) {
        this.careerHistoryService = careerHistoryService;
    }

    @GetMapping
    public List<CareerHistoryResponseDto> getHistories() {
        Long userId = 1L;
        return careerHistoryService.getHistories(userId);
    }

    @GetMapping("/{historyId}")
    public CareerHistoryDetailResponseDto getHistoryDetail(@PathVariable Long historyId) {
        Long userId = 1L;
        return careerHistoryService.getHistoryDetail(userId, historyId);
    }

    @GetMapping("/competency-report")
    public CareerCompetencyReportResponseDto getCompetencyReport() {
        Long userId = 1L;
        return careerHistoryService.getCompetencyReport(userId);
    }

    @GetMapping("/roadmap")
    public List<CareerRoadmapResponseDto> getRoadmap() {
        Long userId = 1L;
        return careerHistoryService.getRoadmap(userId);
    }
}
