package kr.co.carrer.admin.member.service.impl;

import kr.co.carrer.admin.member.dto.HrManagerDTO;
import kr.co.carrer.admin.member.dto.MemberDTO;
import kr.co.carrer.admin.member.entity.HrManager;
import kr.co.carrer.admin.member.entity.Member;
import kr.co.carrer.admin.member.entity.SuspendHistory;
import kr.co.carrer.admin.member.repository.HrManagerRepository;
import kr.co.carrer.admin.member.repository.MemberQueryRepository;
import kr.co.carrer.admin.member.repository.AdminMemberRepository;
import kr.co.carrer.admin.member.repository.SuspendHistoryRepository;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.RoleType;
import kr.co.carrer.admin.member.type.SanctionType;
import kr.co.carrer.admin.member.type.SubscriptionStatus;
import kr.co.carrer.admin.member.type.SuspendDuration;
import kr.co.carrer.admin.member.exception.AdminMemberErrorCode;
import kr.co.carrer.admin.member.service.AdminMemberService;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminMemberServiceImpl implements AdminMemberService {

    private final AdminMemberRepository memberRepository;
    private final MemberQueryRepository memberQueryRepository;
    private final HrManagerRepository hrManagerRepository;
    private final SuspendHistoryRepository suspendHistoryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<MemberDTO.ResponseList> getMembers(RoleType role, MemberStatus status,
                                                                  SubscriptionStatus plan, String keyword,
                                                                  LocalDate startDate, LocalDate endDate,
                                                                  int page, int size) {
        size = Math.min(size, 100);
        int offset = (page - 1) * size;
        DateRange range = toDateRange(startDate, endDate);

        List<MemberDTO.ResponseList> items = memberQueryRepository.findMembers(role, status, plan, keyword, range.from(), range.to(), offset, size);
        long total = memberQueryRepository.countMembers(role, status, plan, keyword, range.from(), range.to());

        return PaginationResponse.of(items, page, size, total);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberDTO.ResponseDetail getMemberDetail(UUID memberId) {
        return memberQueryRepository.findMemberDetail(memberId)
            .orElseThrow(() -> new CustomException(AdminMemberErrorCode.MEMBER_NOT_FOUND));
    }

    @Override
    @Transactional
    public MemberDTO.ResponseSanction sanctionMember(UUID memberId, MemberDTO.RequestSanction dto, Long adminId) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new CustomException(AdminMemberErrorCode.MEMBER_NOT_FOUND));

        if (member.getMemberStatus() == MemberStatus.BANNED) {
            throw new CustomException(AdminMemberErrorCode.ALREADY_BANNED);
        }

        String reason = dto.reason();
        validateReason(reason);

        SanctionType sanctionType = dto.sanctionType();
        if (sanctionType == null) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
        SuspendDuration duration = dto.duration();
        LocalDate today   = LocalDate.now();
        LocalDate endDate = null;

        switch (sanctionType) {
            case WARNING -> {
                if (member.getWarningCount() >= 3) {
                    throw new CustomException(AdminMemberErrorCode.MAX_WARNING_EXCEEDED);
                }
                member.increaseWarningCount();
            }
            case SUSPEND -> {
                if (member.getMemberStatus() == MemberStatus.SUSPENDED) {
                    throw new CustomException(AdminMemberErrorCode.ALREADY_SUSPENDED);
                }
                if (duration == null || duration == SuspendDuration.PERMANENT) {
                    throw new CustomException(AdminMemberErrorCode.INVALID_SANCTION_DURATION);
                }
                endDate = calculateSuspendEndDate(today, duration);
                member.suspend(endDate);
            }
            case BLACKLIST -> member.ban();
        }

        SuspendDuration historyDuration = (sanctionType == SanctionType.SUSPEND) ? duration : null;
        SuspendHistory history = SuspendHistory.create(
            memberId, adminId, sanctionType, historyDuration, reason,
            sanctionType == SanctionType.SUSPEND ? today : null,
            endDate
        );
        suspendHistoryRepository.save(history);

        return new MemberDTO.ResponseSanction(
            member.getMemberId(),
            member.getMemberStatus(),
            sanctionType,
            duration,
            history.getStartDate(),
            history.getEndDate()
        );
    }

    private LocalDate calculateSuspendEndDate(LocalDate from, SuspendDuration duration) {
        return switch (duration) {
            case THREE_DAYS  -> from.plusDays(3);
            case SEVEN_DAYS  -> from.plusDays(7);
            case THIRTY_DAYS -> from.plusDays(30);
            default -> throw new CustomException(AdminMemberErrorCode.INVALID_SANCTION_DURATION);
        };
    }

    @Override
    @Transactional(readOnly = true)
    public HrManagerDTO.ResponsePage getHrManagers(HrStatus hrStatus, String keyword,
                                                    LocalDate startDate, LocalDate endDate,
                                                    int page, int size) {
        size = Math.min(size, 100);
        int offset = (page - 1) * size;
        DateRange range = toDateRange(startDate, endDate);

        List<HrManagerDTO.ResponseList> items = memberQueryRepository.findHrManagers(hrStatus, keyword, range.from(), range.to(), offset, size);
        long total = memberQueryRepository.countHrManagers(hrStatus, keyword, range.from(), range.to());
        long pendingCount = hrManagerRepository.countByHrStatus(HrStatus.PENDING);

        PaginationResponse<HrManagerDTO.ResponseList> pagination = PaginationResponse.of(items, page, size, total);
        return new HrManagerDTO.ResponsePage(
            pagination.items(),
            pagination.page(),
            pagination.size(),
            pagination.totalItems(),
            pagination.totalPages(),
            pendingCount
        );
    }

    @Override
    @Transactional(readOnly = true)
    public HrManagerDTO.ResponseDetail getHrManagerDetail(UUID memberId) {
        return memberQueryRepository.findHrManagerDetail(memberId)
            .orElseThrow(() -> new CustomException(AdminMemberErrorCode.HR_MANAGER_NOT_FOUND));
    }

    @Override
    @Transactional
    public HrManagerDTO.ResponseApprove approveHrManager(UUID memberId) {
        HrManager hrManager = hrManagerRepository.findByMemberId(memberId)
            .orElseThrow(() -> new CustomException(AdminMemberErrorCode.HR_MANAGER_NOT_FOUND));

        if (hrManager.getHrStatus() != HrStatus.PENDING) {
            throw new CustomException(AdminMemberErrorCode.ALREADY_PROCESSED);
        }

        hrManager.approve();

        return new HrManagerDTO.ResponseApprove(memberId, hrManager.getHrStatus(), hrManager.getApprovedAt());
    }

    @Override
    @Transactional
    public HrManagerDTO.ResponseReject rejectHrManager(UUID memberId, HrManagerDTO.RequestReject dto) {
        HrManager hrManager = hrManagerRepository.findByMemberId(memberId)
            .orElseThrow(() -> new CustomException(AdminMemberErrorCode.HR_MANAGER_NOT_FOUND));

        if (hrManager.getHrStatus() != HrStatus.PENDING) {
            throw new CustomException(AdminMemberErrorCode.ALREADY_PROCESSED);
        }

        String rejectReason = dto.rejectReason();
        validateReason(rejectReason);

        hrManager.reject(rejectReason);

        return new HrManagerDTO.ResponseReject(memberId, hrManager.getHrStatus(), hrManager.getRejectReason());
    }

    private void validateReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new CustomException(AdminMemberErrorCode.REASON_REQUIRED);
        }
        if (reason.strip().length() < 10) {
            throw new CustomException(AdminMemberErrorCode.REASON_TOO_SHORT);
        }
    }

    private record DateRange(ZonedDateTime from, ZonedDateTime to) {}

    private DateRange toDateRange(LocalDate startDate, LocalDate endDate) {
        ZonedDateTime from = startDate != null ? startDate.atStartOfDay(ZoneId.systemDefault()) : null;
        ZonedDateTime to   = endDate   != null ? endDate.plusDays(1).atStartOfDay(ZoneId.systemDefault()) : null;
        return new DateRange(from, to);
    }
}
