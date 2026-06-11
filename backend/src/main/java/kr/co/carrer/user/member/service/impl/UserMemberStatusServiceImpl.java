package kr.co.carrer.user.member.service.impl;

import jakarta.persistence.EntityManager;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.member.dto.MemberStatusDto;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.service.UserMemberStatusService;
import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserMemberStatusServiceImpl implements UserMemberStatusService {

    private final UserMemberRepository memberRepository;
    private final EntityManager entityManager;

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

        boolean recoverable = status == MemberStatus.SUSPENDED || status == MemberStatus.LOCKED;
        Instant availableAt = null;
        String reason = null;
        Instant startedAt = null;
        String duration = null;

        if (status == MemberStatus.LOCKED) {
            availableAt = member.getLockedUntil();
        } else {
            // suspend_histories에서 최근 이력 1건 조회 (cross-domain: native query 사용)
            List<?> rows = entityManager.createNativeQuery(
                    "SELECT reason, start_date, end_date, duration " +
                    "FROM suspend_histories WHERE member_id = :memberId " +
                    "ORDER BY created_at DESC LIMIT 1"
            ).setParameter("memberId", member.getMemberId()).getResultList();

            if (!rows.isEmpty()) {
                Object[] row = (Object[]) rows.get(0);
                reason = (String) row[0];
                startedAt = row[1] != null ? toInstant(row[1]) : null;
                availableAt = row[2] != null ? toInstant(row[2]) : null;
                duration = row[3] != null ? row[3].toString() : null;
            }
        }

        return new MemberStatusDto.Restriction(
                status.name(),
                recoverable,
                availableAt,
                MemberStatusDto.Restriction.MESSAGE_CODE,
                reason,
                startedAt,
                duration
        );
    }

    private Instant toInstant(Object dateObj) {
        if (dateObj instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate().atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        if (dateObj instanceof LocalDate localDate) {
            return localDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        return null;
    }

    private CompanyApprovalStatus resolveApprovalStatus(Member member) {
        if (member.getRoleType() != RoleType.COMPANY) return CompanyApprovalStatus.NONE;

        Object result = entityManager.createNativeQuery(
                "SELECT hr_status FROM hr_managers WHERE member_id = :memberId LIMIT 1"
        ).setParameter("memberId", member.getMemberId()).getResultList()
                .stream().findFirst().orElse(null);

        if (result == null) return CompanyApprovalStatus.NONE;
        return switch (result.toString()) {
            case "PENDING" -> CompanyApprovalStatus.PENDING_REVIEW;
            case "ACTIVE"  -> CompanyApprovalStatus.APPROVED;
            case "REMOVED" -> CompanyApprovalStatus.REJECTED;
            default -> CompanyApprovalStatus.NONE;
        };
    }
}
