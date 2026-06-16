package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.member.dto.MemberStatusDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.repository.UserMemberStatusQueryRepository;
import kr.co.carrer.user.member.service.UserMemberStatusService;
import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserMemberStatusServiceImpl implements UserMemberStatusService {

    private final UserMemberRepository memberRepository;
    private final UserMemberStatusQueryRepository statusQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public MemberStatusDto.Response getMemberStatus(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        CompanyApprovalStatus approvalStatus = resolveApprovalStatus(member);
        MemberStatusDto.Restriction restriction = buildRestriction(member);

        return new MemberStatusDto.Response(
                member.getMemberId(),
                member.getRoleType(),
                member.getMemberStatus(),
                approvalStatus,
                restriction
        );
    }

    private MemberStatusDto.Restriction buildRestriction(Member member) {
        MemberStatus status = member.getMemberStatus();
        if (status == MemberStatus.ACTIVE) return null;

        boolean recoverable;
        Instant availableAt = null;
        String reason = null;
        Instant startedAt = null;
        String duration = null;
        String messageCode;

        switch (status) {
            case LOCKED -> {
                recoverable = true;
                availableAt = member.getLockedUntil();
                messageCode = MemberStatusDto.Restriction.MESSAGE_CODE_LOCKED;
            }
            case SUSPENDED -> {
                recoverable = true;
                messageCode = MemberStatusDto.Restriction.MESSAGE_CODE_SUSPENDED;
                UserMemberStatusQueryRepository.SuspendHistoryRow row =
                        statusQueryRepository.findLatestSuspendHistory(member.getMemberId());
                if (row != null) {
                    reason = row.reason();
                    startedAt = row.startedAt();
                    availableAt = row.availableAt();
                    duration = row.duration();
                }
            }
            case BANNED -> {
                recoverable = false;
                messageCode = MemberStatusDto.Restriction.MESSAGE_CODE_BANNED;
            }
            case WITHDRAWN -> {
                recoverable = false;
                messageCode = MemberStatusDto.Restriction.MESSAGE_CODE_WITHDRAWN;
            }
            case BLACKLISTED -> {
                recoverable = false;
                messageCode = MemberStatusDto.Restriction.MESSAGE_CODE_BLACKLISTED;
            }
            default -> {
                recoverable = false;
                messageCode = MemberStatusDto.Restriction.MESSAGE_CODE_BANNED;
            }
        }

        return new MemberStatusDto.Restriction(
                status.name(),
                recoverable,
                availableAt,
                messageCode,
                reason,
                startedAt,
                duration
        );
    }

    private CompanyApprovalStatus resolveApprovalStatus(Member member) {
        if (member.getRoleType() != RoleType.COMPANY) return CompanyApprovalStatus.NONE;
        return statusQueryRepository.findCompanyApprovalStatus(member.getMemberId());
    }
}
