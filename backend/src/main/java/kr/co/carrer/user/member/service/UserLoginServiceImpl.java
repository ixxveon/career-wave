package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserLoginDto;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;



import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.dto.CompanyApprovalStatus;
import kr.co.carrer.user.member.dto.MemberStatus;
import kr.co.carrer.user.member.dto.MemberType;
import kr.co.carrer.user.member.dto.RoleType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class UserLoginServiceImpl implements UserLoginService {

    private final UserMemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final EntityManager entityManager;

    public UserLoginServiceImpl(UserMemberRepository memberRepository,
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
    public UserLoginDto.Response login(UserLoginDto.Request request, HttpServletResponse response) {
        Member member = memberRepository.findByLoginId(request.getLoginId())
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.getPassword(), member.getPassword())) {
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        // roleType 일치 검증 (프론트 탭과 실제 role_type이 같아야 함)
        RoleType expectedRole = request.getRoleType() == MemberType.USER
                ? RoleType.USER : RoleType.COMPANY;
        if (member.getRoleType() != expectedRole) {
            throw new CustomException(AuthErrorCode.AUTH_INVALID_CREDENTIALS);
        }

        validateAccountStatus(member);

        member.updateLastLoginAt(Instant.now());

        AccountType accountType = member.getRoleType() == RoleType.USER
                ? AccountType.USER : AccountType.COMPANY;

        String accessToken = jwtTokenProvider.createAccessToken(
                member.getMemberId().toString(),
                accountType,
                member.getRoleType().name(),
                null
        );

        String refreshToken = jwtTokenProvider.createRefreshToken(
                member.getMemberId().toString(),
                accountType,
                null
        );

        setRefreshTokenCookie(response, refreshToken);

        CompanyApprovalStatus approvalStatus = resolveCompanyApprovalStatus(member);

        UserLoginDto.MemberInfo summary = UserLoginDto.MemberInfo.of(
                member.getMemberId(),
                member.getLoginId(),
                member.getName(),
                member.getRoleType(),
                member.getMemberStatus(),
                member.getSubscriptionStatus(),
                approvalStatus,
                member.getLastLoginAt()
        );

        return new UserLoginDto.Response(accessToken, summary);
    }

    private void validateAccountStatus(Member member) {
        switch (member.getMemberStatus()) {
            case SUSPENDED -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
            case BANNED -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
            case WITHDRAWN -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
            case LOCKED -> {
                // locked_until이 지났으면 자동 복구
                if (member.getLockedUntil() != null && Instant.now().isBefore(member.getLockedUntil())) {
                    throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
                }
            }
            default -> {}
        }
        // 기업 회원 승인 상태 체크
        if (member.getRoleType() == RoleType.COMPANY) {
            CompanyApprovalStatus status = resolveCompanyApprovalStatus(member);
            switch (status) {
                case PENDING_REVIEW -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_PENDING_REVIEW);
                case REJECTED -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_REJECTED);
                case NEEDS_REVISION -> throw new CustomException(UserAuthErrorCode.AUTH_COMPANY_NEEDS_REVISION);
                default -> {}
            }
        }
    }

    private CompanyApprovalStatus resolveCompanyApprovalStatus(Member member) {
        if (member.getRoleType() != RoleType.COMPANY) {
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
            // 알 수 없는 hr_status 값은 안전하게 차단 (fail-close)
            default -> throw new CustomException(ErrorCode.FORBIDDEN);
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
