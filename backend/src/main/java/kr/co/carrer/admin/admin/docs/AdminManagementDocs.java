package kr.co.carrer.admin.admin.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.admin.admin.dto.AdminAclDTO;
import kr.co.carrer.admin.admin.dto.AdminManagementDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Management", description = "관리자 계정 및 IP ACL 관리 API")
public interface AdminManagementDocs {

    String UNAUTHORIZED_EXAMPLE = "{\"success\":false,\"statusCode\":401,\"message\":\"인증이 필요합니다.\",\"code\":\"AUTH_UNAUTHENTICATED\",\"data\":null}";
    String FORBIDDEN_EXAMPLE = "{\"success\":false,\"statusCode\":403,\"message\":\"접근 권한이 없습니다.\",\"code\":\"AUTH_FORBIDDEN\",\"data\":null}";
    String BAD_REQUEST_BODY_EXAMPLE = "{\"success\":false,\"statusCode\":400,\"message\":\"요청 본문을 읽을 수 없습니다. JSON 형식 및 필드값을 확인해주세요.\",\"data\":null}";
    String BAD_REQUEST_QUERY_EXAMPLE = "{\"success\":false,\"statusCode\":400,\"message\":\"요청 파라미터가 올바르지 않습니다.\",\"data\":null}";

    @Operation(summary = "관리자 관리 KPI 요약 조회")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "관리자 관리 KPI 요약 조회 성공"),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminManagementDTO.ResponseSummary>> getAdminSummary();

    @Operation(summary = "관리자 계정 목록 조회")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "관리자 계정 목록 조회 성공"),
        @ApiResponse(responseCode = "400", description = "잘못된 필터 값", content = @Content(examples = @ExampleObject(value = BAD_REQUEST_QUERY_EXAMPLE))),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminManagementDTO.ResponseList>> getAdmins(
        @Parameter(description = "검색어") @RequestParam(required = false) String keyword,
        @Parameter(description = "관리자 권한", schema = @Schema(allowableValues = {"MASTER", "CS", "BACKEND"})) @RequestParam(required = false) String role,
        @Parameter(description = "관리자 상태", schema = @Schema(allowableValues = {"ACTIVE", "LOCKED"})) @RequestParam(required = false) String status,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "관리자 계정 생성")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "관리자 계정 생성 성공"),
        @ApiResponse(
            responseCode = "409",
            description = "이미 사용 중인 관리자 이메일",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 사용 중인 관리자 이메일입니다.\",\"code\":\"ADMIN_EMAIL_ALREADY_EXISTS\",\"data\":null}"))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "유효하지 않은 관리자 권한",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":400,\"message\":\"유효하지 않은 관리자 권한입니다.\",\"code\":\"INVALID_ADMIN_ROLE\",\"data\":null}"))
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminManagementDTO.ResponseAdmin>> createAdmin(
        @Valid @RequestBody AdminManagementDTO.RequestCreateAdmin request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "관리자 권한 변경")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "관리자 권한 변경 성공"),
        @ApiResponse(
            responseCode = "404",
            description = "관리자 계정 없음",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":404,\"message\":\"관리자 계정을 찾을 수 없습니다.\",\"code\":\"ADMIN_NOT_FOUND\",\"data\":null}"))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "유효하지 않은 관리자 권한",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":400,\"message\":\"유효하지 않은 관리자 권한입니다.\",\"code\":\"INVALID_ADMIN_ROLE\",\"data\":null}"))
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminManagementDTO.ResponseAdmin>> updateAdminRole(
        @Parameter(description = "관리자 ID") @PathVariable Long adminId,
        @Valid @RequestBody AdminManagementDTO.RequestUpdateRole request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "관리자 상태 변경")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "관리자 상태 변경 성공"),
        @ApiResponse(
            responseCode = "404",
            description = "관리자 계정 없음",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":404,\"message\":\"관리자 계정을 찾을 수 없습니다.\",\"code\":\"ADMIN_NOT_FOUND\",\"data\":null}"))
        ),
        @ApiResponse(
            responseCode = "400",
            description = "유효하지 않은 관리자 상태",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":400,\"message\":\"유효하지 않은 관리자 상태입니다.\",\"code\":\"INVALID_ADMIN_STATUS\",\"data\":null}"))
        ),
        @ApiResponse(
            responseCode = "409",
            description = "중복 상태 변경",
            content = @Content(examples = {
                @ExampleObject(name = "alreadyLocked", value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 잠금 상태인 관리자 계정입니다.\",\"code\":\"ADMIN_ALREADY_LOCKED\",\"data\":null}"),
                @ExampleObject(name = "alreadyActive", value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 활성 상태인 관리자 계정입니다.\",\"code\":\"ADMIN_ALREADY_ACTIVE\",\"data\":null}")
            })
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminManagementDTO.ResponseAdmin>> updateAdminStatus(
        @Parameter(description = "관리자 ID") @PathVariable Long adminId,
        @Valid @RequestBody AdminManagementDTO.RequestUpdateStatus request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "관리자 계정 삭제")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "관리자 계정 삭제 성공"),
        @ApiResponse(
            responseCode = "404",
            description = "관리자 계정 없음",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":404,\"message\":\"관리자 계정을 찾을 수 없습니다.\",\"code\":\"ADMIN_NOT_FOUND\",\"data\":null}"))
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<Void>> deleteAdmin(
        @Parameter(description = "관리자 ID") @PathVariable Long adminId,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "IP ACL 목록 조회")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "IP ACL 목록 조회 성공"),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminAclDTO.ResponseList>> getIpAcls(
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") int page,
        @Parameter(description = "페이지 크기") @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "IP ACL 등록")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "IP ACL 등록 성공"),
        @ApiResponse(
            responseCode = "409",
            description = "중복 IP 범위",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 등록된 IP 범위입니다.\",\"code\":\"IP_ACL_DUPLICATED_RANGE\",\"data\":null}"))
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminAclDTO.ResponseItem>> createIpAcl(
        @Valid @RequestBody AdminAclDTO.RequestCreate request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "IP ACL 활성 상태 변경")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "IP ACL 활성 상태 변경 성공"),
        @ApiResponse(
            responseCode = "404",
            description = "IP ACL 정보 없음",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":404,\"message\":\"IP ACL 정보를 찾을 수 없습니다.\",\"code\":\"IP_ACL_NOT_FOUND\",\"data\":null}"))
        ),
        @ApiResponse(
            responseCode = "409",
            description = "중복 활성 상태 변경",
            content = @Content(examples = {
                @ExampleObject(name = "alreadyEnabled", value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 활성 상태인 IP ACL입니다.\",\"code\":\"IP_ACL_ALREADY_ENABLED\",\"data\":null}"),
                @ExampleObject(name = "alreadyDisabled", value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 비활성 상태인 IP ACL입니다.\",\"code\":\"IP_ACL_ALREADY_DISABLED\",\"data\":null}")
            })
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<AdminAclDTO.ResponseItem>> updateIpAclEnabled(
        @Parameter(description = "IP ACL ID") @PathVariable Long aclId,
        @Valid @RequestBody AdminAclDTO.RequestToggleEnabled request,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );

    @Operation(summary = "IP ACL 삭제")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "IP ACL 삭제 성공"),
        @ApiResponse(
            responseCode = "404",
            description = "IP ACL 정보 없음",
            content = @Content(examples = @ExampleObject(value = "{\"success\":false,\"statusCode\":404,\"message\":\"IP ACL 정보를 찾을 수 없습니다.\",\"code\":\"IP_ACL_NOT_FOUND\",\"data\":null}"))
        ),
        @ApiResponse(responseCode = "401", description = "인증 필요", content = @Content(examples = @ExampleObject(value = UNAUTHORIZED_EXAMPLE))),
        @ApiResponse(responseCode = "403", description = "권한 없음", content = @Content(examples = @ExampleObject(value = FORBIDDEN_EXAMPLE)))
    })
    ResponseEntity<kr.co.carrer.global.response.ApiResponse<Void>> deleteIpAcl(
        @Parameter(description = "IP ACL ID") @PathVariable Long aclId,
        @AuthenticationPrincipal AuthPrincipal principal,
        HttpServletRequest httpServletRequest
    );
}
