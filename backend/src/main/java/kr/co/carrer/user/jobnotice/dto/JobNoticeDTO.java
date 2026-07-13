package kr.co.carrer.user.jobnotice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

public class JobNoticeDTO {

    @Schema(description = "Job notice list item")
    public record ResponseSummary(
            @Schema(description = "Job notice ID")
            Long jobNoticeId,

            @Schema(description = "Company name")
            String companyName,

            @Schema(description = "Job notice title")
            String title,

            @Schema(description = "Skill tags")
            List<String> skillTags,

            @Schema(description = "Job type", allowableValues = {"FULLTIME", "INTERN", "CONTRACT"})
            JobType jobType,

            @Schema(description = "Company size", allowableValues = {"STARTUP", "SME", "MID_MARKET", "LARGE"})
            CompanySize companySize,

            @Schema(description = "Job categories")
            List<String> jobCategory,

            @Schema(description = "Career level", allowableValues = {"JUNIOR", "SENIOR", "ANY"})
            CareerLevel careerLevel,

            @Schema(description = "Location")
            String location,

            @Schema(description = "Salary information")
            String salary,

            @Schema(description = "Notice status", allowableValues = {"ACTIVE", "CLOSED"})
            JobNoticeStatus noticeStatus,

            @Schema(description = "Notice source")
            String source,

            @Schema(description = "View count")
            Integer viewCount,

            @Schema(description = "Deadline")
            LocalDate deadline,

            @Schema(description = "Created at")
            ZonedDateTime createdAt,

            @Schema(description = "Whether the current user bookmarked the notice")
            boolean bookmarked,

            @Schema(description = "Company logo URL")
            String companyLogoUrl
    ) {}

    @Schema(description = "Job notice list response")
    public record ResponseList(
            @Schema(description = "Job notice items")
            List<ResponseSummary> content,

            @Schema(description = "Current page, 1-based")
            int page,

            @Schema(description = "Page size")
            int size,

            @Schema(description = "Total element count")
            long totalElements,

            @Schema(description = "Total page count")
            int totalPages,

            @Schema(description = "List stats")
            ResponseListStats stats,

            @Schema(description = "Filter options")
            ResponseFilterOptions filterOptions
    ) {}

    @Schema(description = "Job notice list stats")
    public record ResponseListStats(
            @Schema(description = "Total active notice count")
            long totalOpenCount,

            @Schema(description = "Today's new active notice count")
            long todayNewCount,

            @Schema(description = "Today's new notice delta; null when there is no comparison base")
            Long todayNewDelta,

            @Schema(description = "Today's new notice rate in percent")
            double todayNewRate
    ) {}

    @Schema(description = "Job notice filter options")
    public record ResponseFilterOptions(
            @Schema(description = "Job type filter options", allowableValues = {"FULLTIME", "INTERN", "CONTRACT"})
            List<String> jobType,

            @Schema(description = "Job category filter options")
            List<String> jobCategory,

            @Schema(description = "Career level filter options", allowableValues = {"JUNIOR", "SENIOR", "ANY"})
            List<String> careerLevel,

            @Schema(description = "Location filter options")
            List<String> location,

            @Schema(description = "Company size filter options", allowableValues = {"STARTUP", "SME", "MID_MARKET", "LARGE"})
            List<String> companySize
    ) {}

    @Schema(description = "Job notice detail response")
    public record ResponseDetail(
            @Schema(description = "Job notice ID")
            Long jobNoticeId,

            @Schema(description = "Company name")
            String companyName,

            @Schema(description = "Job notice title")
            String title,

            @Schema(description = "Job notice description")
            String description,

            @Schema(description = "Skill tags")
            List<String> skillTags,

            @Schema(description = "Job type", allowableValues = {"FULLTIME", "INTERN", "CONTRACT"})
            JobType jobType,

            @Schema(description = "Company size", allowableValues = {"STARTUP", "SME", "MID_MARKET", "LARGE"})
            CompanySize companySize,

            @Schema(description = "Job categories")
            List<String> jobCategory,

            @Schema(description = "Career level", allowableValues = {"JUNIOR", "SENIOR", "ANY"})
            CareerLevel careerLevel,

            @Schema(description = "Location")
            String location,

            @Schema(description = "Salary information")
            String salary,

            @Schema(description = "Notice status", allowableValues = {"ACTIVE", "CLOSED"})
            JobNoticeStatus noticeStatus,

            @Schema(description = "Original URL")
            String originalUrl,

            @Schema(description = "Notice source")
            String source,

            @Schema(description = "View count")
            Integer viewCount,

            @Schema(description = "Deadline")
            LocalDate deadline,

            @Schema(description = "Created at")
            ZonedDateTime createdAt,

            @Schema(description = "Updated at")
            ZonedDateTime updatedAt,

            @Schema(description = "Whether the current user bookmarked the notice")
            boolean bookmarked,

            @Schema(description = "Company logo URL")
            String companyLogoUrl
    ) {}

    @Schema(description = "Job notice bookmark response")
    public record ResponseBookmark(
            @Schema(description = "Job notice ID")
            Long jobNoticeId,

            @Schema(description = "Bookmark status")
            boolean bookmarked
    ) {}
}
