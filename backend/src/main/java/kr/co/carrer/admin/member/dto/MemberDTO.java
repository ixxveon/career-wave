package kr.co.carrer.admin.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SanctionType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import kr.co.carrer.admin.member.type.SuspendDuration;

import kr.co.carrer.admin.member.util.PersonalInfoMasker;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

public class MemberDTO {

    @Schema(description = "개인 회원 목록 응답")
    public record ResponseList(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "로그인 ID") String loginId,
        @Schema(description = "이름") String name,
        @Schema(description = "이메일") String email,
        @Schema(description = "역할", allowableValues = {"USER", "COMPANY"}) RoleType role,
        @Schema(description = "구독 상태", allowableValues = {"FREE", "PREMIUM"}) SubscriptionStatus plan,
        @Schema(description = "계정 상태", allowableValues = {"ACTIVE", "SUSPENDED", "BANNED", "LOCKED", "WITHDRAWN", "BLACKLISTED"}) MemberStatus memberStatus,
        @Schema(description = "경고 횟수") int warningCount,
        @Schema(description = "신고 횟수") long reportCount,
        @Schema(description = "가입 일시") ZonedDateTime joinedAt,
        @Schema(description = "마지막 로그인 일시") ZonedDateTime lastLoginAt
    ) {
        public ResponseList masked() {
            return new ResponseList(
                memberId,
                PersonalInfoMasker.maskLoginId(loginId),
                PersonalInfoMasker.maskName(name),
                PersonalInfoMasker.maskEmail(email),
                role, plan, memberStatus, warningCount, reportCount, joinedAt, lastLoginAt
            );
        }
    }

    @Schema(description = "개인 회원 상세 응답")
    public record ResponseDetail(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "로그인 ID") String loginId,
        @Schema(description = "이름") String name,
        @Schema(description = "이메일") String email,
        @Schema(description = "역할", allowableValues = {"USER", "COMPANY"}) RoleType role,
        @Schema(description = "구독 상태", allowableValues = {"FREE", "PREMIUM"}) SubscriptionStatus plan,
        @Schema(description = "계정 상태", allowableValues = {"ACTIVE", "SUSPENDED", "BANNED", "LOCKED", "WITHDRAWN", "BLACKLISTED"}) MemberStatus memberStatus,
        @Schema(description = "경고 횟수") int warningCount,
        @Schema(description = "신고 횟수") long reportCount,
        @Schema(description = "가입 일시") ZonedDateTime joinedAt,
        @Schema(description = "마지막 로그인 일시") ZonedDateTime lastLoginAt,
        @Schema(description = "최근 제재 유형 (정지 상태일 때만)") SanctionType sanctionType,
        @Schema(description = "정지 기간") SuspendDuration suspendDuration,
        @Schema(description = "정지 시작일") LocalDate suspendStartDate,
        @Schema(description = "정지 종료일") LocalDate suspendEndDate
    ) {}

    @Schema(description = "회원 제재 요청")
    public record RequestSanction(
        @Schema(description = "제재 유형", allowableValues = {"WARNING", "SUSPEND", "BLACKLIST"}, requiredMode = Schema.RequiredMode.REQUIRED) SanctionType sanctionType,
        @Schema(description = "정지 기간 (SUSPEND일 때만 필수)", allowableValues = {"THREE_DAYS", "SEVEN_DAYS", "THIRTY_DAYS"}) SuspendDuration duration,
        @Schema(description = "제재 사유 (최소 10자)", requiredMode = Schema.RequiredMode.REQUIRED) String reason
    ) {}

    @Schema(description = "회원 KPI 집계 응답")
    public record ResponseCounts(
        @Schema(description = "오늘 신규 가입 수") long todayJoinCount,
        @Schema(description = "프리미엄 구독 회원 수") long premiumCount,
        @Schema(description = "정지 회원 수") long suspendedCount
    ) {}

    @Schema(description = "정지 해제 요청")
    public record RequestUnsuspend(
        @Schema(description = "해제 사유 (최소 10자)", requiredMode = Schema.RequiredMode.REQUIRED) String reason
    ) {}

    @Schema(description = "정지 해제 응답")
    public record ResponseUnsuspend(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "변경된 계정 상태") MemberStatus memberStatus
    ) {}

    @Schema(description = "회원 제재 응답")
    public record ResponseSanction(
        @Schema(description = "회원 UUID") UUID memberId,
        @Schema(description = "변경된 계정 상태") MemberStatus memberStatus,
        @Schema(description = "적용된 제재 유형") SanctionType sanctionType,
        @Schema(description = "정지 기간") SuspendDuration duration,
        @Schema(description = "정지 시작일") LocalDate startDate,
        @Schema(description = "정지 종료일") LocalDate endDate
    ) {}
}
