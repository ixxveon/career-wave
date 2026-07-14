package kr.co.carrer.user.dashboard.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.dashboard.entity.PersonalProfile;
import kr.co.carrer.user.dashboard.repository.DashboardBookmarkQueryRepository;
import kr.co.carrer.user.dashboard.repository.PersonalProfileRepository;
import kr.co.carrer.user.dashboard.service.DashboardService;
import kr.co.carrer.user.jobnotice.entity.Bookmark;
import kr.co.carrer.user.jobnotice.exception.JobNoticeErrorCode;
import kr.co.carrer.user.jobnotice.repository.BookmarkRepository;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.MemberVerificationRepository;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.service.impl.UserVerificationServiceImpl;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final UserMemberRepository memberRepository;
    private final PersonalProfileRepository personalProfileRepository;
    private final BookmarkRepository bookmarkRepository;
    private final DashboardBookmarkQueryRepository dashboardBookmarkQueryRepository;
    private final MemberVerificationRepository verificationRepository;

    @Override
    public DashboardDTO.ProfileResponse getProfile(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        return toProfileResponse(member);
    }

    @Override
    public DashboardDTO.GithubResponse getGithubProfile(UUID memberId) {
        if (!memberRepository.existsById(memberId)) {
            throw new CustomException(ErrorCode.NOT_FOUND);
        }

        return personalProfileRepository.findByMemberId(memberId)
                .map(this::toGithubResponse)
                .orElseGet(() -> new DashboardDTO.GithubResponse(null, null, false));
    }

    @Override
    @Transactional
    public DashboardDTO.ProfileResponse updateProfile(
            UUID memberId,
            DashboardDTO.ProfileUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        String name = request.name() != null ? request.name() : member.getName();
        String email = request.email() != null && !request.email().isBlank()
        ? request.email()
        : member.getEmail();
        String phone = request.phone() != null ? request.phone() : member.getPhone();

        // 이메일/휴대폰을 실제로 다른 값으로 변경하는 경우에만 인증을 요구한다
        // (미변경이거나 빈 값으로 지우는 경우는 소유권 증명이 필요 없다).
        if (email != null && !email.isBlank() && !Objects.equals(email, member.getEmail())) {
            verifyChangeToken(request.emailVerificationToken(), VerificationChannel.EMAIL, email, VerificationPurpose.EMAIL_CHANGE);
        }
        if (phone != null && !phone.isBlank() && !Objects.equals(phone, member.getPhone())) {
            verifyChangeToken(request.phoneVerificationToken(), VerificationChannel.PHONE, phone, VerificationPurpose.PHONE_CHANGE);
        }

        member.updateProfile(name, email, phone);

        if (request.githubUrl() != null) {
            PersonalProfile personalProfile = personalProfileRepository.findByMemberId(memberId)
                    .orElseGet(() -> PersonalProfile.create(memberId));

            personalProfile.updateGithubUrl(request.githubUrl());
            personalProfileRepository.save(personalProfile);
        }

        return toProfileResponse(member);
    }

    @Override
    public PaginationResponse<DashboardDTO.BookmarkResponse> getBookmarks(
            UUID memberId,
            String keyword,
            int page,
            int size) {

        int safePage = Math.max(page, 1);

        Page<DashboardDTO.BookmarkResponse> result = dashboardBookmarkQueryRepository.findBookmarks(
                memberId,
                keyword,
                safePage,
                size);

        return PaginationResponse.of(
                result.getContent(),
                safePage,
                size,
                result.getTotalElements());
    }

    @Override
    @Transactional
    public void deleteBookmark(UUID memberId, Long bookmarkId) {
        Bookmark bookmark = bookmarkRepository.findByBookmarkIdAndMemberId(bookmarkId, memberId)
                .orElseThrow(() -> new CustomException(JobNoticeErrorCode.BOOKMARK_NOT_FOUND));

        bookmarkRepository.delete(bookmark);
    }

    private void verifyChangeToken(String token, VerificationChannel channel, String target, VerificationPurpose purpose) {
        if (token == null || token.isBlank()) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        MemberVerification verification = verificationRepository.findByVerificationToken(token)
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));
        UserVerificationServiceImpl.validateVerificationToken(verification, channel, target, purpose);
    }

    private DashboardDTO.ProfileResponse toProfileResponse(Member member) {
        return new DashboardDTO.ProfileResponse(
                member.getMemberId(),
                member.getLoginId(),
                member.getEmail(),
                member.getName(),
                member.getPhone(),
                member.getRoleType(),
                member.getMemberStatus(),
                member.getSubscriptionStatus(),
                member.getCreatedAt().atZone(SERVICE_ZONE_ID));
    }

    private DashboardDTO.GithubResponse toGithubResponse(PersonalProfile personalProfile) {
        String githubUrl = personalProfile.getGithubUrl();
        boolean linked = githubUrl != null && !githubUrl.isBlank();

        return new DashboardDTO.GithubResponse(
                extractGithubId(githubUrl),
                githubUrl,
                linked);
    }

    private String extractGithubId(String githubUrl) {
        if (githubUrl == null || githubUrl.isBlank()) {
            return null;
        }

        try {
            URI uri = URI.create(githubUrl.trim());

            String host = uri.getHost();
            if (host == null ||
                    (!host.equals("github.com")
                            && !host.equals("www.github.com"))) {
                return null;
            }

            String path = uri.getPath();

            if (path == null || path.isBlank() || "/".equals(path)) {
                return null;
            }

            String[] segments = path.split("/");

            for (String segment : segments) {
                if (!segment.isBlank()) {
                    return segment;
                }
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }
}