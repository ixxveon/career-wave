package kr.co.carrer.user.dashboard.controller;

import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.dashboard.docs.DashboardControllerDocs;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/dashboard")
public class DashboardController implements DashboardControllerDocs {

    private final DashboardService dashboardService;
    // TODO: userJWT 구현 완료 후 RequestParam memberId 제거하고 인증 객체 기반 조회로 변경
    @Override
    // TODO: userJWT 구현 완료 후 RequestParam memberId 제거 및 인증 객체 기반 조회로 변경
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> getProfile(
            @RequestParam UUID memberId
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        dashboardService.getProfile(memberId)
                )
        );
    }
     // TODO: userJWT 구현 완료 후 RequestParam memberId 제거하고 인증 객체 기반 조회로 변경
    @Override
    // TODO: userJWT 구현 완료 후 RequestParam memberId 제거 및 인증 객체 기반 조회로 변경
    @GetMapping("/github")
    public ResponseEntity<ApiResponse<DashboardDTO.GithubResponse>> getGithubProfile(
            @RequestParam UUID memberId
    ) {
        return ResponseEntity.ok(
                ApiResponse.ok(
                        dashboardService.getGithubProfile(memberId)
                )
        );
    }

}
