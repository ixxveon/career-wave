package kr.co.carrer.user.dashboard.service;

import kr.co.carrer.admin.member.entity.Member;
import kr.co.carrer.admin.member.repository.MemberRepository;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.dashboard.entity.PersonalProfile;
import kr.co.carrer.user.dashboard.repository.PersonalProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MemberRepository memberRepository;
    private final PersonalProfileRepository personalProfileRepository;

    public DashboardDTO.ProfileResponse getProfile(UUID memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        return new DashboardDTO.ProfileResponse(
                member.getMemberId(),
                member.getLoginId(),
                member.getEmail(),
                member.getName(),
                member.getPhone(),
                member.getRoleType(),
                member.getMemberStatus(),
                member.getSubscriptionStatus(),
                member.getCreatedAt()
        );
    }

    public DashboardDTO.GithubResponse getGithubProfile(UUID memberId) {
        memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        return personalProfileRepository.findByMemberId(memberId)
                .map(this::toGithubResponse)
                .orElseGet(() -> new DashboardDTO.GithubResponse(null, null, false));
    }

    private DashboardDTO.GithubResponse toGithubResponse(PersonalProfile personalProfile) {
        String githubUrl = personalProfile.getGithubUrl();
        boolean linked = githubUrl != null && !githubUrl.isBlank();

        return new DashboardDTO.GithubResponse(
                extractGithubId(githubUrl),
                githubUrl,
                linked
        );
    }

    private String extractGithubId(String githubUrl) {
        if (githubUrl == null || githubUrl.isBlank()) {
            return null;
        }

        try {
            URI uri = URI.create(githubUrl.trim());
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