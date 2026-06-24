package kr.co.carrer.user.careerhistory.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerCompetencyReportResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerHistoryResponse;
import kr.co.carrer.user.careerhistory.dto.response.CareerRoadmapResponse;
import kr.co.carrer.user.careerhistory.service.CareerHistoryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public ApiResponse<List<CareerHistoryResponse>> getHistories(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long userId = Long.valueOf(principal.getId());
        return ApiResponse.ok(careerHistoryService.getHistories(userId));
    }

    @GetMapping("/{historyId}")
    public ApiResponse<CareerHistoryDetailResponse> getHistoryDetail(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long historyId
    ) {
        Long userId = Long.valueOf(principal.getId());
        return ApiResponse.ok(careerHistoryService.getHistoryDetail(userId, historyId));
    }

    @GetMapping("/competency-report")
    public ApiResponse<CareerCompetencyReportResponse> getCompetencyReport(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long userId = Long.valueOf(principal.getId());
        return ApiResponse.ok(careerHistoryService.getCompetencyReport(userId));
    }

    @GetMapping("/roadmap")
    public ApiResponse<List<CareerRoadmapResponse>> getRoadmap(
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long userId = Long.valueOf(principal.getId());
        return ApiResponse.ok(careerHistoryService.getRoadmap(userId));
    }
}
