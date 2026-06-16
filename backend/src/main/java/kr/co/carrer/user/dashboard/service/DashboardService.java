package kr.co.carrer.user.dashboard.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;

import java.util.UUID;

public interface DashboardService {

    DashboardDTO.ProfileResponse getProfile(UUID memberId);

    DashboardDTO.GithubResponse getGithubProfile(UUID memberId);

    DashboardDTO.ProfileResponse updateProfile(
            UUID memberId,
            DashboardDTO.ProfileUpdateRequest request);

    PaginationResponse<DashboardDTO.BookmarkResponse> getBookmarks(
            UUID memberId,
            String keyword,
            int page,
            int size);

    void deleteBookmark(
            UUID memberId,
            Long bookmarkId);
}