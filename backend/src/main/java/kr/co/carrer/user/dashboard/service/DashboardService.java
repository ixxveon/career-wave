package kr.co.carrer.user.dashboard.service;

import kr.co.carrer.user.dashboard.dto.DashboardDTO;

import java.util.UUID;

public interface DashboardService {

    DashboardDTO.ProfileResponse getProfile(UUID memberId);

    DashboardDTO.GithubResponse getGithubProfile(UUID memberId);
}