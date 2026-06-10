package kr.co.carrer.admin.member.controller;

import kr.co.carrer.admin.member.docs.AdminMemberControllerDocs;
import kr.co.carrer.admin.member.dto.HrManagerDTO;
import kr.co.carrer.admin.member.dto.MemberDTO;
import kr.co.carrer.admin.member.service.AdminMemberService;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.admin.member.exception.MemberErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
// TODO: 스웨거 테스트용 임시 비활성화 — JWT 필터 구현 후 롤백 필요
// @PreAuthorize("hasRole('ADMIN')")
public class AdminMemberController implements AdminMemberControllerDocs {

    private final AdminMemberService adminMemberService;

    @GetMapping("/members")
    public ResponseEntity<ApiResponse<PaginationResponse<MemberDTO.ResponseList>>> getMembers(
        @RequestParam(required = false) String role,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String plan,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        RoleType roleType = parseEnum(RoleType.class, role);
        MemberStatus memberStatus = parseEnum(MemberStatus.class, status);
        SubscriptionStatus subscriptionStatus = parseEnum(SubscriptionStatus.class, plan);

        return ResponseEntity.ok(ApiResponse.ok(
            adminMemberService.getMembers(roleType, memberStatus, subscriptionStatus,
                keyword, startDate, endDate, page, size)
        ));
    }

    @GetMapping("/members/{memberId}")
    public ResponseEntity<ApiResponse<MemberDTO.ResponseDetail>> getMemberDetail(
        @PathVariable UUID memberId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminMemberService.getMemberDetail(memberId)));
    }

    @PostMapping("/members/{memberId}/sanctions")
    public ResponseEntity<ApiResponse<MemberDTO.ResponseSanction>> sanctionMember(
        @PathVariable UUID memberId,
        @RequestBody MemberDTO.RequestSanction request,
        @AuthenticationPrincipal Long adminId
    ) {
        // TODO: 스웨거 테스트용 임시 fallback — JWT 필터 구현 후 제거 필요
        Long resolvedAdminId = (adminId != null) ? adminId : 1L;
        return ResponseEntity.ok(ApiResponse.ok(adminMemberService.sanctionMember(memberId, request, resolvedAdminId)));
    }

    @GetMapping("/hr-managers")
    public ResponseEntity<ApiResponse<HrManagerDTO.ResponsePage>> getHrManagers(
        @RequestParam(required = false) String hrStatus,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        HrStatus hrStatusEnum = parseEnum(HrStatus.class, hrStatus);
        return ResponseEntity.ok(ApiResponse.ok(
            adminMemberService.getHrManagers(hrStatusEnum, keyword, startDate, endDate, page, size)
        ));
    }

    @GetMapping("/hr-managers/{memberId}")
    public ResponseEntity<ApiResponse<HrManagerDTO.ResponseDetail>> getHrManagerDetail(
        @PathVariable UUID memberId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminMemberService.getHrManagerDetail(memberId)));
    }

    @PatchMapping("/hr-managers/{memberId}/approve")
    public ResponseEntity<ApiResponse<HrManagerDTO.ResponseApprove>> approveHrManager(
        @PathVariable UUID memberId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminMemberService.approveHrManager(memberId)));
    }

    @PatchMapping("/hr-managers/{memberId}/reject")
    public ResponseEntity<ApiResponse<HrManagerDTO.ResponseReject>> rejectHrManager(
        @PathVariable UUID memberId,
        @RequestBody HrManagerDTO.RequestReject request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminMemberService.rejectHrManager(memberId, request)));
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(MemberErrorCode.INVALID_MEMBER_FILTER);
        }
    }
}
