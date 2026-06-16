package kr.co.carrer.user.dashboard.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@Tag(name = "User Dashboard", description = "사용자 대시보드 API")
public interface DashboardControllerDocs {

        @Operation(summary = "프로필 조회", description = "로그인한 사용자의 프로필 정보를 조회합니다.")
        ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> getProfile(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal);

        @Operation(summary = "GitHub 연동 정보 조회", description = "로그인한 사용자의 GitHub 연동 정보를 조회합니다.")
        ResponseEntity<ApiResponse<DashboardDTO.GithubResponse>> getGithubProfile(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal);

        @Operation(summary = "프로필 수정", description = "로그인한 사용자의 프로필 정보를 수정합니다.")
        ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> updateProfile(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
                        DashboardDTO.ProfileUpdateRequest request);
}