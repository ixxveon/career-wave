package kr.co.carrer.user.jobnotice.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Tag(name = "User JobNotice", description = "Public job notice read APIs and bookmark APIs for signed-in users.")
public interface UserJobNoticeControllerDocs {

    @Operation(
            summary = "Get public job notices",
            description = "Returns only ACTIVE job notices. Authentication is optional. "
                    + "Guests always receive bookmarked=false. Signed-in users receive bookmarked based on their own bookmark relation.",
            security = {}
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Job notice list retrieved successfully.",
                    content = @Content(schema = @Schema(implementation = JobNoticeDTO.ResponseList.class))
            )
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<JobNoticeDTO.ResponseList>> getJobNotices(
            @Parameter(description = "Keyword search over title, description, companyName, skillTags, jobCategory, and source.")
            @RequestParam(required = false) String keyword,
            @Parameter(description = "Standard job type filters. Repeat the query parameter for multiple values.", schema = @Schema(allowableValues = {"FULL_TIME", "CONTRACT", "INTERN", "FREELANCE", "DAILY"}))
            @RequestParam(required = false) List<JobType> jobType,
            @Parameter(description = "Job category filters. Repeat the query parameter for multiple values.")
            @RequestParam(required = false) List<String> jobCategory,
            @Parameter(description = "Standard career filters. Repeat the query parameter for multiple values.", schema = @Schema(allowableValues = {"FRESHER", "ANY_EXPERIENCE", "INTERN", "UNDER_1", "OVER_1", "OVER_2", "OVER_3", "OVER_5", "OVER_7", "OVER_10"}))
            @RequestParam(required = false) List<CareerLevel> careerLevel,
            @Parameter(description = "Normalized representative location filters. Repeat the query parameter for multiple values.")
            @RequestParam(required = false) List<String> location,
            @Parameter(description = "Standard company size filters. Repeat the query parameter for multiple values.", schema = @Schema(allowableValues = {"STARTUP", "SME", "MID_MARKET", "LARGE", "PUBLIC", "UNICORN", "FOREIGN"}))
            @RequestParam(required = false) List<CompanySize> companySize,
            @Parameter(description = "Created-at period filter.", schema = @Schema(allowableValues = {"today", "7d", "30d", "all"}))
            @RequestParam(required = false) String period,
            @Parameter(description = "List sort order.", schema = @Schema(allowableValues = {"recommend", "latest", "views"}))
            @RequestParam(required = false) String sort,
            @Parameter(description = "Page number. External API contract is 1-based.")
            @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Page size.")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(
            summary = "Get public job notice detail",
            description = "Returns one ACTIVE job notice by id. Authentication is optional. "
                    + "Guests always receive bookmarked=false. Signed-in users receive bookmarked based on their own bookmark relation.",
            security = {}
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Job notice detail retrieved successfully.",
                    content = @Content(schema = @Schema(implementation = JobNoticeDTO.ResponseDetail.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "JOB_NOTICE_NOT_FOUND"
            )
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<JobNoticeDTO.ResponseDetail>> getJobNoticeDetail(
            @Parameter(description = "Job notice id.")
            @PathVariable Long jobNoticeId,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(
            summary = "Create bookmark for a job notice",
            description = "Creates a bookmark for the signed-in USER. Request body is not used.",
            security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Bookmark created successfully.",
                    content = @Content(schema = @Schema(implementation = JobNoticeDTO.ResponseBookmark.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "JOB_NOTICE_NOT_FOUND"
            ),
            @ApiResponse(
                    responseCode = "409",
                    description = "BOOKMARK_ALREADY_EXISTS"
            )
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<JobNoticeDTO.ResponseBookmark>> createBookmark(
            @Parameter(description = "Job notice id.")
            @PathVariable Long jobNoticeId,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(
            summary = "Delete bookmark for a job notice",
            description = "Deletes a bookmark for the signed-in USER. Request body is not used.",
            security = {@SecurityRequirement(name = "bearerAuth")}
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Bookmark deleted successfully.",
                    content = @Content(schema = @Schema(implementation = JobNoticeDTO.ResponseBookmark.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "BOOKMARK_NOT_FOUND"
            )
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<JobNoticeDTO.ResponseBookmark>> deleteBookmark(
            @Parameter(description = "Job notice id.")
            @PathVariable Long jobNoticeId,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );
}
