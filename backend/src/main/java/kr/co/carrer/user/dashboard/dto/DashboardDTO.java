package kr.co.carrer.user.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;

import java.time.ZonedDateTime;
import java.util.UUID;

public class DashboardDTO {

        @Schema(description = "사용자 프로필 조회 응답")
        public record ProfileResponse(
                        @Schema(description = "회원 UUID") UUID memberId,

                        @Schema(description = "로그인 ID") String loginId,

                        @Schema(description = "이메일") String email,

                        @Schema(description = "이름") String name,

                        @Schema(description = "휴대폰 번호") String phone,

                        @Schema(description = "회원 유형") RoleType roleType,

                        @Schema(description = "회원 상태") MemberStatus memberStatus,

                        @Schema(description = "구독 상태") SubscriptionStatus subscriptionStatus,

                        @Schema(description = "가입일") ZonedDateTime createdAt) {
        }

        @Schema(description = "GitHub 연동 정보 조회 응답")
        public record GithubResponse(
                        @Schema(description = "GitHub ID") String githubId,

                        @Schema(description = "GitHub URL") String githubUrl,

                        @Schema(description = "연동 여부") boolean linked) {
        }

        @Schema(description = "사용자 프로필 수정 요청")
        public record ProfileUpdateRequest(
                        @Schema(description = "이름") @NotBlank @Size(max = 50) String name,

                        @Schema(description = "휴대폰 번호") @NotBlank @Pattern(regexp = "^01[0-9]-?\\d{3,4}-?\\d{4}$") String phone,

                        @Schema(description = "GitHub URL") @Pattern(regexp = "^(https?://)?(www\\.)?github\\.com/[A-Za-z0-9-]+/?$") String githubUrl) {
        }
}