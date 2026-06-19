package kr.co.carrer.user.dashboard.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "User Dashboard", description = "사용자 대시보드 API")
public interface DashboardControllerDocs {

        @Operation(summary = "프로필 조회", description = "로그인한 사용자의 프로필 정보를 조회합니다.")
        ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> getProfile(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal);

        @Operation(summary = "GitHub 연동 정보 조회", description = "로그인한 사용자의 GitHub 연동 정보를 조회합니다. 연동되지 않은 경우 linked=false를 반환합니다.")
        ResponseEntity<ApiResponse<DashboardDTO.GithubResponse>> getGithubProfile(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal);

        @Operation(summary = "프로필 수정", description = "로그인한 사용자의 프로필 정보를 수정합니다.")
        ResponseEntity<ApiResponse<DashboardDTO.ProfileResponse>> updateProfile(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
                        @io.swagger.v3.oas.annotations.parameters.RequestBody(description = "프로필 수정 요청", required = true) 
                        @Valid DashboardDTO.ProfileUpdateRequest request);

        @Operation(summary = "스크랩 공고 목록 조회", description = "로그인한 사용자의 스크랩 공고 목록을 조회합니다. keyword로 기업명/공고 제목 검색이 가능합니다.")
        ResponseEntity<ApiResponse<PaginationResponse<DashboardDTO.BookmarkResponse>>> getBookmarks(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
                        @Parameter(description = "기업명 또는 공고 제목 검색어") @RequestParam(required = false) String keyword,
                        @Parameter(description = "페이지 번호. 1부터 시작합니다.", example = "1") @RequestParam(defaultValue = "1") int page,
                        @Parameter(description = "페이지 크기", example = "20") @RequestParam(defaultValue = "20") int size);

        @Operation(summary = "스크랩 공고 취소", description = "로그인한 사용자의 본인 소유 스크랩 공고를 취소합니다.")
        ResponseEntity<ApiResponse<Void>> deleteBookmark(
                        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal,
                        @Parameter(description = "삭제할 북마크 ID", example = "1") @PathVariable Long bookmarkId);
}