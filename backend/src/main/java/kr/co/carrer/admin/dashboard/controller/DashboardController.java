package kr.co.carrer.admin.dashboard.controller;

import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.admin.dashboard.service.DashboardService;
import kr.co.carrer.admin.dashboard.type.DashboardRangeType;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('BACKEND') or hasRole('CS'))")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardDTO.ResponseSummary>> getSummary(
            @RequestParam(required = false) String range
    ) {
        DashboardDTO.RequestSummary request = new DashboardDTO.RequestSummary(
                DashboardRangeType.fromJsonValue(range)
        );

        return ResponseEntity.ok(ApiResponse.ok(
                "관리자 대시보드 요약 조회에 성공했습니다.",
                dashboardService.getSummary(request)
        ));
    }
}
