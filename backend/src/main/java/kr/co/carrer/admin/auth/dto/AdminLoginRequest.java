package kr.co.carrer.admin.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminLoginRequest(
        @NotBlank String loginId,
        @NotBlank String password
) {}
