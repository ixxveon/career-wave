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

    @Schema(description = "채용 공고 목록 요약 응답")
    public record ResponseSummary(
            @Schema(description = "채용 공고 ID")
            Long jobNoticeId,

            @Schema(description = "회사명")
            String companyName,

            @Schema(description = "공고 제목")
            String title,

            @Schema(description = "기술 태그 목록")
            List<String> skillTags,

            @Schema(description = "채용 유형", allowableValues = {"FULLTIME", "INTERN", "CONTRACT"})
            JobType jobType,

            @Schema(description = "회사 규모", allowableValues = {"STARTUP", "SME", "LARGE"})
            CompanySize companySize,

            @Schema(description = "직무/직군")
            List<String> jobCategory,

            @Schema(description = "경력 수준", allowableValues = {"JUNIOR", "SENIOR", "ANY"})
            CareerLevel careerLevel,

            @Schema(description = "근무 지역")
            String location,

            @Schema(description = "급여 정보")
            String salary,

            @Schema(description = "공고 상태", allowableValues = {"ACTIVE", "CLOSED"})
            JobNoticeStatus noticeStatus,

            @Schema(description = "공고 출처")
            String source,

            @Schema(description = "조회 수")
            Integer viewCount,

            @Schema(description = "마감일")
            LocalDate deadline,

            @Schema(description = "생성 시각")
            ZonedDateTime createdAt,

            @Schema(description = "현재 사용자 기준 북마크 여부")
            boolean bookmarked
    ) {}

    @Schema(description = "채용 공고 목록 응답")
    public record ResponseList(
            @Schema(description = "채용 공고 목록")
            List<ResponseSummary> content,

            @Schema(description = "현재 페이지, 1-based")
            int page,

            @Schema(description = "페이지 크기")
            int size,

            @Schema(description = "전체 건수")
            long totalElements,

            @Schema(description = "전체 페이지 수")
            int totalPages,

            ResponseListStats stats,

            ResponseFilterOptions filterOptions
    ) {}

    public record ResponseListStats(
            long totalOpenCount,
            long todayNewCount,
            long todayNewDelta,
            double todayNewRate
    ) {}

    public record ResponseFilterOptions(
            List<String> jobType,
            List<String> jobCategory,
            List<String> careerLevel,
            List<String> location,
            List<String> companySize
    ) {}

    @Schema(description = "채용 공고 상세 응답")
    public record ResponseDetail(
            @Schema(description = "채용 공고 ID")
            Long jobNoticeId,

            @Schema(description = "회사명")
            String companyName,

            @Schema(description = "공고 제목")
            String title,

            @Schema(description = "공고 설명")
            String description,

            @Schema(description = "기술 태그 목록")
            List<String> skillTags,

            @Schema(description = "채용 유형", allowableValues = {"FULLTIME", "INTERN", "CONTRACT"})
            JobType jobType,

            @Schema(description = "회사 규모", allowableValues = {"STARTUP", "SME", "LARGE"})
            CompanySize companySize,

            @Schema(description = "직무/직군")
            List<String> jobCategory,

            @Schema(description = "경력 수준", allowableValues = {"JUNIOR", "SENIOR", "ANY"})
            CareerLevel careerLevel,

            @Schema(description = "근무 지역")
            String location,

            @Schema(description = "급여 정보")
            String salary,

            @Schema(description = "공고 상태", allowableValues = {"ACTIVE", "CLOSED"})
            JobNoticeStatus noticeStatus,

            @Schema(description = "원문 URL")
            String originalUrl,

            @Schema(description = "공고 출처")
            String source,

            @Schema(description = "조회 수")
            Integer viewCount,

            @Schema(description = "마감일")
            LocalDate deadline,

            @Schema(description = "생성 시각")
            ZonedDateTime createdAt,

            @Schema(description = "수정 시각")
            ZonedDateTime updatedAt,

            @Schema(description = "현재 사용자 기준 북마크 여부")
            boolean bookmarked
    ) {}

    @Schema(description = "채용 공고 북마크 응답")
    public record ResponseBookmark(
            @Schema(description = "채용 공고 ID")
            Long jobNoticeId,

            @Schema(description = "북마크 상태")
            boolean bookmarked
    ) {}
}
