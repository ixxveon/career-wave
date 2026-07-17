package kr.co.carrer.admin.member.service;

import kr.co.carrer.admin.member.dto.HrManagerDTO;
import kr.co.carrer.admin.member.dto.MemberDTO;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import kr.co.carrer.global.response.PaginationResponse;

import java.time.LocalDate;
import java.util.UUID;

public interface AdminMemberService {

    MemberDTO.ResponseCounts getMemberCounts();

    PaginationResponse<MemberDTO.ResponseList> getMembers(RoleType role, MemberStatus status,
                                                          SubscriptionStatus plan, String keyword,
                                                          LocalDate startDate, LocalDate endDate,
                                                          int page, int size, String adminRole);

    MemberDTO.ResponseDetail getMemberDetail(UUID memberId, Long adminId, String ipAddress);

    MemberDTO.ResponseSanction sanctionMember(UUID memberId, MemberDTO.RequestSanction dto, Long adminId, String ipAddress);

    MemberDTO.ResponseUnsuspend unsuspendMember(UUID memberId, MemberDTO.RequestUnsuspend dto, Long adminId, String ipAddress);

    MemberDTO.ResponseUnsuspend unbanMember(UUID memberId, MemberDTO.RequestUnsuspend dto, Long adminId, String adminRole, String ipAddress);

    HrManagerDTO.ResponsePage getHrManagers(HrStatus hrStatus, String keyword,
                                            LocalDate startDate, LocalDate endDate,
                                            int page, int size);

    HrManagerDTO.ResponseDetail getHrManagerDetail(UUID memberId);

    HrManagerDTO.ResponseApprove approveHrManager(UUID memberId);

    HrManagerDTO.ResponseReject rejectHrManager(UUID memberId, HrManagerDTO.RequestReject dto);
}
