package kr.co.carrer.user.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kr.co.carrer.user.member.type.RoleType;

public record UserLoginRequest(
        @NotBlank String loginId,
        @NotBlank String password,
        @NotNull RoleType memberType
) {}
