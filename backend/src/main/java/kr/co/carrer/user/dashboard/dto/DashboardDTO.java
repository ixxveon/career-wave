package kr.co.carrer.user.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

public class DashboardDTO {

        @Schema(description = "사용자 프로필 조회 응답")
        public record ProfileResponse(
                        @Schema(description = "회원 UUID", example = "550e8400-e29b-41d4-a716-446655440000") UUID memberId,

                        @Schema(description = "로그인 ID", example = "testuser01") String loginId,

                        @Schema(description = "이메일", example = "testuser01@test.com") String email,

                        @Schema(description = "이름", example = "홍길동") String name,

                        @Schema(description = "휴대폰 번호", example = "01012345678") String phone,

                        @Schema(description = "회원 유형", example = "USER") RoleType roleType,

                        @Schema(description = "회원 상태", example = "ACTIVE") MemberStatus memberStatus,

                        @Schema(description = "구독 상태", example = "FREE") SubscriptionStatus subscriptionStatus,

                        @Schema(description = "가입일", example = "2026-06-17T14:00:00+09:00") ZonedDateTime createdAt) {

        }

        @Schema(description = "GitHub 연동 정보 조회 응답")
        public record GithubResponse(
                        @Schema(description = "GitHub ID", example = "octocat") String githubId,

                        @Schema(description = "GitHub URL", example = "https://github.com/octocat") String githubUrl,

                        @Schema(description = "연동 여부", example = "true") boolean linked) {
        }

        @Schema(description = "사용자 프로필 수정 요청")
        public record ProfileUpdateRequest(

                        @Schema(description = "이름", example = "홍길동") @Size(min = 2, max = 20) String name,

                        @Schema(description = "휴대폰 번호", example = "01012345678") @Pattern(regexp = "^01[0-9]{8,9}$", message = "휴대폰 번호 형식이 올바르지 않습니다.") String phone,

                        @Schema(description = "GitHub URL", example = "https://github.com/octocat") @Size(max = 300) @Pattern(regexp = "^https://(www\\.)?github\\.com/[A-Za-z0-9-]+/?$", message = "GitHub URL 형식이 올바르지 않습니다.") String githubUrl

        ) {
        }

        @Schema(description = "대시보드 스크랩 공고 응답")
        public record BookmarkResponse(
                        @Schema(description = "북마크 ID", example = "1") Long bookmarkId,
                        @Schema(description = "채용공고 ID", example = "100") Long jobNoticeId,
                        @Schema(description = "기업명", example = "네이버") String companyName,
                        @Schema(description = "공고 제목", example = "백엔드 개발자 채용") String title,
                        @Schema(description = "근무 지역", example = "서울") String location,
                        @Schema(description = "경력 수준", example = "신입") String careerLevel,
                        @Schema(description = "공고 상태", example = "OPEN") String noticeStatus,
                        @Schema(description = "공고 출처", example = "CAREER_WAVE") String source,
                        @Schema(description = "마감일", example = "2026-06-30") LocalDate deadline,
                        @Schema(description = "스크랩한 일시", example = "2026-06-17T14:00:00+09:00") ZonedDateTime bookmarkedAt) {
        }
}