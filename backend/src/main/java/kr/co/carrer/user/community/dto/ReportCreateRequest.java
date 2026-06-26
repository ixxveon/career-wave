package kr.co.carrer.user.community.dto;

import jakarta.validation.constraints.NotNull;
import kr.co.carrer.user.community.type.ReportReason;
import kr.co.carrer.user.community.type.ReportTargetType;

public record ReportCreateRequest(
        @NotNull
        ReportTargetType targetType,

        @NotNull
        Long targetId,

        @NotNull
        ReportReason reason
) {
}
