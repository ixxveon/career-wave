package kr.co.carrer.admin.auth.dto;

public record AdminLoginResponse(
        String accessToken,
        AdminInfo adminInfo
) {}
