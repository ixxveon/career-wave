package kr.co.carrer.user.dashboard.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {

    @Test
    @DisplayName("프로필 조회 - 정상")
    void getProfile_success() {
    }

    @Test
    @DisplayName("프로필 조회 - 회원 없음")
    void getProfile_memberNotFound() {
    }

    @Test
    @DisplayName("GitHub 연동 정보 조회 - 정상")
    void getGithubProfile_success() {
    }

    @Test
    @DisplayName("GitHub 미연동 정보 조회")
    void getGithubProfile_notLinked() {
    }
}