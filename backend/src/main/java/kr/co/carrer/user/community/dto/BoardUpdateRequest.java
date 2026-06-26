package kr.co.carrer.user.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BoardUpdateRequest(
        @NotBlank
        @Size(max = 30)
        String category,

        @NotBlank
        @Size(max = 200)
        String title,

        @NotBlank
        String content
) {
}
