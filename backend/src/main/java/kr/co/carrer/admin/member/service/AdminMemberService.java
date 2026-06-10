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

    PaginationResponse<MemberDTO.ResponseList> getMembers(RoleType role, MemberStatus status,
                                                          SubscriptionStatus plan, String keyword,
                                                          LocalDate startDate, LocalDate endDate,
                                                          int page, int size);

    MemberDTO.ResponseDetail getMemberDetail(UUID memberId);

    MemberDTO.ResponseSanction sanctionMember(UUID memberId, MemberDTO.RequestSanction dto, Long adminId);

    HrManagerDTO.ResponsePage getHrManagers(HrStatus hrStatus, String keyword,
                                            LocalDate startDate, LocalDate endDate,
                                            int page, int size);

    HrManagerDTO.ResponseDetail getHrManagerDetail(UUID memberId);

    HrManagerDTO.ResponseApprove approveHrManager(UUID memberId);

    HrManagerDTO.ResponseReject rejectHrManager(UUID memberId, HrManagerDTO.RequestReject dto);
}
