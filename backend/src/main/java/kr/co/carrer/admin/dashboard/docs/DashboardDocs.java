package kr.co.carrer.admin.dashboard.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.admin.dashboard.dto.DashboardDTO;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Dashboard", description = "Admin dashboard summary API")
@SecurityRequirement(name = "bearerAuth")
public interface DashboardDocs {

    String BAD_REQUEST_EXAMPLE = "{\"success\":false,\"statusCode\":400,\"message\":\"Unsupported dashboard range.\",\"code\":\"BAD_REQUEST\",\"data\":null}";
    String UNAUTHORIZED_EXAMPLE = "{\"success\":false,\"statusCode\":401,\"message\":\"Authentication is required.\",\"code\":\"UNAUTHORIZED\",\"data\":null}";
    String FORBIDDEN_EXAMPLE = "{\"success\":false,\"statusCode\":403,\"message\":\"Access is denied.\",\"code\":\"FORBIDDEN\",\"data\":null}";
    String INTERNAL_SERVER_ERROR_EXAMPLE = "{\"success\":false,\"statusCode\":500,\"message\":\"Dashboard summary aggregation failed.\",\"code\":\"INTERNAL_SERVER_ERROR\",\"data\":null}";

    @Operation(
            summary = "Get admin dashboard summary",
            description = "Returns dashboard KPI, alert, service card, system status, and recent activity summary. "
                    + "The range query parameter accepts only TODAY, 7D, and 30D. Missing range defaults to TODAY."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Dashboard summary retrieved"
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "Invalid range query parameter",
                    content = @Content(examples = @ExampleObject(value = BAD_REQUEST_EXAMPLE))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Authentication required",
                    content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Allowed only for MASTER, BACKEND, or CS admin roles",
                    content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE))
            ),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "500",
                    description = "Dashboard summary aggregation failed",
                    content = @Content(examples = @ExampleObject(value = INTERNAL_SERVER_ERROR_EXAMPLE))
            )
    })
    ResponseEntity<ApiResponse<DashboardDTO.ResponseSummary>> getSummary(
            @Parameter(
                    description = "Aggregation range. Defaults to TODAY when omitted.",
                    example = "TODAY",
                    schema = @Schema(allowableValues = {"TODAY", "7D", "30D"})
            )
            @RequestParam(required = false) String range
    );
}
