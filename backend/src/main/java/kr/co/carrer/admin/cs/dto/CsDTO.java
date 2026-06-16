package kr.co.carrer.admin.cs.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public class CsDTO {

    @Schema(description = "고객센터 KPI 집계 응답")
    public record ResponseSummary(
        long noticeCount,
        long faqCount,
        long pendingCount,
        long inProgressCount
    ) {}
}
