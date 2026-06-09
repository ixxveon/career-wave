package kr.co.carrer.user.member.service;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import kr.co.carrer.global.auth.jwt.AccountType;
import kr.co.carrer.global.auth.jwt.JwtProperties;
import kr.co.carrer.global.auth.jwt.JwtTokenProvider;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.member.dto.MemberSummary;
import kr.co.carrer.user.member.dto.UserLoginRequest;
import kr.co.carrer.user.member.dto.UserLoginResponse;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.MemberRepository;
import kr.co.carrer.user.member.type.CompanyApprovalStatus;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class UserLoginService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final EntityManager entityManager;

    public UserLoginService(MemberRepository memberRepository,
                            PasswordEncoder passwordEncoder,
                            JwtTokenProvider jwtTokenProvider,
                            JwtProperties jwtProperties,
                            EntityManager entityManager) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.jwtProperties = jwtProperties;
        this.entityManager = entityManager;
    }

    @Transactional
    public UserLoginResponse login(UserLoginRequest request, HttpServletResponse response) {
        Member member = memberRepository.findByLoginId(request.loginId())
                .orElseThrow(() -> new CustomException(ErrorCode.AUTH_INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new CustomException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        // memberType 일치 검증 (프론트 탭과 실제 role_type이 같아야 함)
        if (member.getRoleType() != request.memberType()) {
            throw new CustomException(ErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        validateAccountStatus(member);

        member.updateLastLoginAt(Instant.now());

        AccountType accountType = member.getRoleType() == RoleType.ROLE_USER
                ? AccountType.USER : AccountType.COMPANY;

        String accessToken = jwtTokenProvider.createAccessToken(
                member.getMemberId().toString(),
                accountType,
                member.getRoleType().name(),
                null
        );

        String refreshToken = jwtTokenProvider.createRefreshToken(
                member.getMemberId().toString(),
                accountType
        );

        setRefreshTokenCookie(response, refreshToken);

        CompanyApprovalStatus approvalStatus = resolveCompanyApprovalStatus(member);

        MemberSummary summary = MemberSummary.of(
                member.getMemberId(),
                member.getLoginId(),
                member.getName(),
                member.getRoleType(),
                member.getMemberStatus(),
                member.getSubscriptionStatus(),
                approvalStatus,
                member.getLastLoginAt()
        );

        return new UserLoginResponse(accessToken, summary);
    }

    private void validateAccountStatus(Member member) {
        switch (member.getMemberStatus()) {
            case SUSPENDED -> throw new CustomException(ErrorCode.AUTH_ACCOUNT_SUSPENDED);
            case BANNED -> throw new CustomException(ErrorCode.AUTH_ACCOUNT_BANNED);
            case WITHDRAWN -> throw new CustomException(ErrorCode.AUTH_ACCOUNT_WITHDRAWN);
            case LOCKED -> {
                // locked_until이 지났으면 자동 복구
                if (member.getLockedUntil() != null && Instant.now().isBefore(member.getLockedUntil())) {
                    throw new CustomException(ErrorCode.AUTH_ACCOUNT_LOCKED);
                }
            }
            default -> {}
        }
        // 기업 회원 승인 상태 체크
        if (member.getRoleType() == RoleType.ROLE_COMPANY) {
            CompanyApprovalStatus status = resolveCompanyApprovalStatus(member);
            switch (status) {
                case PENDING_REVIEW -> throw new CustomException(ErrorCode.AUTH_COMPANY_PENDING_REVIEW);
                case REJECTED -> throw new CustomException(ErrorCode.AUTH_COMPANY_REJECTED);
                case NEEDS_REVISION -> throw new CustomException(ErrorCode.AUTH_COMPANY_NEEDS_REVISION);
                default -> {}
            }
        }
    }

    private CompanyApprovalStatus resolveCompanyApprovalStatus(Member member) {
        if (member.getRoleType() != RoleType.ROLE_COMPANY) {
            return CompanyApprovalStatus.NONE;
        }
        // hr_managers.hr_status를 native query로 조회 (admin 패키지 직접 참조 방지)
        Object result = entityManager.createNativeQuery(
                "SELECT hr_status FROM hr_managers WHERE member_id = :memberId LIMIT 1"
        ).setParameter("memberId", member.getMemberId()).getResultList()
                .stream().findFirst().orElse(null);

        if (result == null) return CompanyApprovalStatus.NONE;
        return switch (result.toString()) {
            case "PENDING" -> CompanyApprovalStatus.PENDING_REVIEW;
            case "ACTIVE" -> CompanyApprovalStatus.APPROVED;
            case "REMOVED" -> CompanyApprovalStatus.REJECTED;
            default -> CompanyApprovalStatus.NONE;
        };
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/user/members")
                .maxAge(jwtProperties.getUser().getRefreshExpiration() / 1000)
                .sameSite("Strict")
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }
}
