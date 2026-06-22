package kr.co.carrer.admin.member.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import kr.co.carrer.admin.member.dto.HrManagerDTO;
import kr.co.carrer.admin.member.dto.MemberDTO;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import kr.co.carrer.auth.principal.AuthPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.UUID;

@Tag(name = "Admin Member", description = "관리자 회원관리 API")
public interface AdminMemberControllerDocs {

    @Operation(summary = "회원 KPI 집계 조회 (오늘 신규 가입 / 프리미엄 구독 / 정지 회원 수)")
    ResponseEntity<ApiResponse<MemberDTO.ResponseCounts>> getMemberCounts();

    @Operation(summary = "개인 회원 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<MemberDTO.ResponseList>>> getMembers(
        @Parameter(description = "역할 (USER / COMPANY)") @RequestParam(required = false) String role,
        @Parameter(description = "상태 (ACTIVE / SUSPENDED / BANNED)") @RequestParam(required = false) String status,
        @Parameter(description = "구독 (FREE / PREMIUM)") @RequestParam(required = false) String plan,
        @Parameter(description = "이름·이메일·로그인ID 통합 검색") @RequestParam(required = false) String keyword,
        @Parameter(description = "가입일 시작 (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @Parameter(description = "가입일 종료 (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") @Min(1) int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    );

    @Operation(summary = "개인 회원 상세 조회")
    ResponseEntity<ApiResponse<MemberDTO.ResponseDetail>> getMemberDetail(
        @Parameter(description = "회원 UUID") @PathVariable UUID memberId
    );

    @Operation(summary = "회원 제재 처리")
    ResponseEntity<ApiResponse<MemberDTO.ResponseSanction>> sanctionMember(
        @Parameter(description = "회원 UUID") @PathVariable UUID memberId,
        @RequestBody MemberDTO.RequestSanction request,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "기업 회원 목록 조회")
    ResponseEntity<ApiResponse<HrManagerDTO.ResponsePage>> getHrManagers(
        @Parameter(description = "기업 회원 상태 (PENDING / ACTIVE / REMOVED)") @RequestParam(required = false) String hrStatus,
        @Parameter(description = "HR 담당자명·기업명·이메일 통합 검색") @RequestParam(required = false) String keyword,
        @Parameter(description = "가입일 시작 (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @Parameter(description = "가입일 종료 (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @Parameter(description = "페이지 번호 (1-based)") @RequestParam(defaultValue = "1") @Min(1) int page,
        @Parameter(description = "페이지 크기 (최대 100)") @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    );

    @Operation(summary = "기업 회원 상세 조회")
    ResponseEntity<ApiResponse<HrManagerDTO.ResponseDetail>> getHrManagerDetail(
        @Parameter(description = "회원 UUID") @PathVariable UUID memberId
    );

    @Operation(summary = "기업 회원 승인")
    ResponseEntity<ApiResponse<HrManagerDTO.ResponseApprove>> approveHrManager(
        @Parameter(description = "회원 UUID") @PathVariable UUID memberId
    );

    @Operation(summary = "기업 회원 반려")
    ResponseEntity<ApiResponse<HrManagerDTO.ResponseReject>> rejectHrManager(
        @Parameter(description = "회원 UUID") @PathVariable UUID memberId,
        @RequestBody HrManagerDTO.RequestReject request
    );
}
