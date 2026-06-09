package kr.co.carrer.user.member.dto;

public record UserLoginResponse(
        String accessToken,
        MemberSummary member
) {}
