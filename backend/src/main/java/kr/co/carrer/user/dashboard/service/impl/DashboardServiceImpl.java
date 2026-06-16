package kr.co.carrer.user.dashboard.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.dashboard.entity.PersonalProfile;
import kr.co.carrer.user.dashboard.repository.PersonalProfileRepository;
import kr.co.carrer.user.dashboard.service.DashboardService;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.ZoneId;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final ZoneId SERVICE_ZONE_ID = ZoneId.of("Asia/Seoul");

    private final UserMemberRepository memberRepository;
    private final PersonalProfileRepository personalProfileRepository;

    @Override
    public DashboardDTO.ProfileResponse getProfile(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

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

    @Override
    public DashboardDTO.GithubResponse getGithubProfile(UUID memberId) {
        memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        return personalProfileRepository.findByMemberId(memberId)
                .map(this::toGithubResponse)
                .orElseGet(() -> new DashboardDTO.GithubResponse(null, null, false));
    }

    @Override
    public DashboardDTO.ProfileResponse updateProfile(
            UUID memberId,
            DashboardDTO.ProfileUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

        String name = request.name() != null ? request.name() : member.getName();
        String phone = request.phone() != null ? request.phone() : member.getPhone();

        member.updateProfile(name, phone);

        if (request.githubUrl() != null) {
            PersonalProfile personalProfile = personalProfileRepository.findByMemberId(memberId)
                    .orElseGet(() -> PersonalProfile.create(memberId));

            personalProfile.updateGithubUrl(request.githubUrl());
            personalProfileRepository.save(personalProfile);
        }
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