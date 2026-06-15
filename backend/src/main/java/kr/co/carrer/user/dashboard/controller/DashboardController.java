package kr.co.carrer.user.dashboard.controller;

import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.dashboard.docs.DashboardControllerDocs;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/dashboard")
public class DashboardController implements DashboardControllerDocs {

        private final DashboardService dashboardService;

        @Override
        @GetMapping("/profile")
        public ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> getProfile(
                        @AuthenticationPrincipal AuthPrincipal principal) {
                UUID memberId = UUID.fromString(principal.getId());

                return ResponseEntity.ok(
                                ApiResponse.ok(
                                                dashboardService.getProfile(memberId)));
        }

        @Override
        @GetMapping("/github")
        public ResponseEntity<ApiResponse<DashboardDTO.GithubResponse>> getGithubProfile(
                        @AuthenticationPrincipal AuthPrincipal principal) {
                UUID memberId = UUID.fromString(principal.getId());

                return ResponseEntity.ok(
                                ApiResponse.ok(
                                                dashboardService.getGithubProfile(memberId)));
        }

        @Override
        @PatchMapping("/profile")
        public ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> updateProfile(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @RequestBody @Valid DashboardDTO.ProfileUpdateRequest request) {
                UUID memberId = UUID.fromString(principal.getId());

                return ResponseEntity.ok(
                                ApiResponse.ok(
                                                dashboardService.updateProfile(memberId, request)));
        }
}