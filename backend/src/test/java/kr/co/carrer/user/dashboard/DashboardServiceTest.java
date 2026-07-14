package kr.co.carrer.user.dashboard;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.dashboard.dto.DashboardDTO;
import kr.co.carrer.user.dashboard.entity.PersonalProfile;
import kr.co.carrer.user.dashboard.repository.PersonalProfileRepository;
import kr.co.carrer.user.dashboard.service.impl.DashboardServiceImpl;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.repository.MemberVerificationRepository;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private UserMemberRepository memberRepository;

    @Mock
    private PersonalProfileRepository personalProfileRepository;

    @Mock
    private MemberVerificationRepository verificationRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    @DisplayName("프로필 조회 - 정상")
    void getProfile_success() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        DashboardDTO.ProfileResponse response = dashboardService.getProfile(memberId);

        assertThat(response.memberId()).isEqualTo(memberId);
        assertThat(response.loginId()).isEqualTo("user01");
        assertThat(response.email()).isEqualTo("user01@test.com");
        assertThat(response.name()).isEqualTo("김지원");
        assertThat(response.phone()).isEqualTo("010-1234-5678");
        assertThat(response.roleType()).isEqualTo(RoleType.USER);
        assertThat(response.memberStatus()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(response.subscriptionStatus()).isEqualTo(SubscriptionStatus.FREE);
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    @DisplayName("프로필 조회 - 회원 없음")
    void getProfile_memberNotFound() {
        UUID memberId = UUID.randomUUID();

        when(memberRepository.findById(memberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> dashboardService.getProfile(memberId))
                .isInstanceOf(CustomException.class);
    }

    @Test
    @DisplayName("GitHub 연동 정보 조회 - 정상")
    void getGithubProfile_success() throws Exception {
        UUID memberId = UUID.randomUUID();
        PersonalProfile personalProfile = createPersonalProfile(
                memberId,
                "https://github.com/career-wave?tab=repositories");

        when(memberRepository.existsById(memberId)).thenReturn(true);
        when(personalProfileRepository.findByMemberId(memberId)).thenReturn(Optional.of(personalProfile));

        DashboardDTO.GithubResponse response = dashboardService.getGithubProfile(memberId);

        assertThat(response.githubId()).isEqualTo("career-wave");
        assertThat(response.githubUrl()).isEqualTo("https://github.com/career-wave?tab=repositories");
        assertThat(response.linked()).isTrue();
    }

    @Test
    @DisplayName("GitHub 미연동 정보 조회")
    void getGithubProfile_notLinked() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        when(memberRepository.existsById(memberId)).thenReturn(true);
        when(personalProfileRepository.findByMemberId(memberId)).thenReturn(Optional.empty());

        DashboardDTO.GithubResponse response = dashboardService.getGithubProfile(memberId);

        assertThat(response.githubId()).isNull();
        assertThat(response.githubUrl()).isNull();
        assertThat(response.linked()).isFalse();
    }

    @Test
    @DisplayName("프로필 수정 - 기존 GitHub 프로필이 있는 경우 정상 수정")
    void updateProfile_existingPersonalProfile_success() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);
        PersonalProfile personalProfile = createPersonalProfile(memberId, "https://github.com/old-user");

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                "고유리",
                null,
                "010-9999-8888",
                "https://github.com/yul941117",
                null,
                "phone-token");

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));
        when(personalProfileRepository.findByMemberId(memberId)).thenReturn(Optional.of(personalProfile));
        when(verificationRepository.findByVerificationToken("phone-token"))
                .thenReturn(Optional.of(verifiedPhoneChange("010-9999-8888", "phone-token")));

        DashboardDTO.ProfileResponse response = dashboardService.updateProfile(memberId, request);

        assertThat(response.memberId()).isEqualTo(memberId);
        assertThat(response.name()).isEqualTo("고유리");
        assertThat(response.phone()).isEqualTo("010-9999-8888");

        DashboardDTO.GithubResponse githubResponse = invokeToGithubResponse(personalProfile);
        assertThat(githubResponse.githubId()).isEqualTo("yul941117");
        assertThat(githubResponse.githubUrl()).isEqualTo("https://github.com/yul941117");
        assertThat(githubResponse.linked()).isTrue();

        verify(personalProfileRepository).save(personalProfile);
    }

    @Test
    @DisplayName("프로필 수정 - 기존 GitHub 프로필이 없는 경우 생성 후 수정")
    void updateProfile_withoutPersonalProfile_createNewProfile() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                "고유리",
                null,
                "010-9999-8888",
                "https://github.com/yul941117",
                null,
                "phone-token");

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));
        when(personalProfileRepository.findByMemberId(memberId)).thenReturn(Optional.empty());
        when(verificationRepository.findByVerificationToken("phone-token"))
                .thenReturn(Optional.of(verifiedPhoneChange("010-9999-8888", "phone-token")));

        DashboardDTO.ProfileResponse response = dashboardService.updateProfile(memberId, request);

        assertThat(response.memberId()).isEqualTo(memberId);
        assertThat(response.name()).isEqualTo("고유리");
        assertThat(response.phone()).isEqualTo("010-9999-8888");

        verify(personalProfileRepository).save(any(PersonalProfile.class));
    }

    @Test
    @DisplayName("프로필 수정 - 회원 없음")
    void updateProfile_memberNotFound() {
        UUID memberId = UUID.randomUUID();

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                "고유리",
                null,
                "010-9999-8888",
                "https://github.com/yul941117",
                null,
                "phone-token");

        when(memberRepository.findById(memberId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> dashboardService.updateProfile(memberId, request))
                .isInstanceOf(CustomException.class);
    }

    @Test
    @DisplayName("프로필 수정 - 이메일 변경 시 인증 토큰 없으면 실패")
    void updateProfile_emailChanged_withoutToken_throws() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                null,
                "new-email@test.com",
                null,
                null,
                null,
                null);

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> dashboardService.updateProfile(memberId, request))
                .isInstanceOf(CustomException.class);
    }

    @Test
    @DisplayName("프로필 수정 - 휴대폰 변경 시 인증 토큰 없으면 실패")
    void updateProfile_phoneChanged_withoutToken_throws() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                null,
                null,
                "010-9999-8888",
                null,
                null,
                null);

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> dashboardService.updateProfile(memberId, request))
                .isInstanceOf(CustomException.class);
    }

    @Test
    @DisplayName("프로필 수정 - 이메일 변경 시 유효한 토큰이면 성공")
    void updateProfile_emailChanged_withValidToken_success() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                null,
                "new-email@test.com",
                null,
                null,
                "email-token",
                null);

        MemberVerification verification = MemberVerification.issue(
                VerificationChannel.EMAIL, "new-email@test.com", VerificationPurpose.EMAIL_CHANGE,
                "hash", Instant.now().plusSeconds(300), Instant.now().plusSeconds(60));
        verification.markVerified("email-token");

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));
        when(verificationRepository.findByVerificationToken("email-token")).thenReturn(Optional.of(verification));

        DashboardDTO.ProfileResponse response = dashboardService.updateProfile(memberId, request);

        assertThat(response.email()).isEqualTo("new-email@test.com");
    }

    @Test
    @DisplayName("프로필 수정 - 토큰의 인증 대상이 요청 값과 다르면 실패")
    void updateProfile_tokenTargetMismatch_throws() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                null,
                "new-email@test.com",
                null,
                null,
                "email-token",
                null);

        // 토큰은 다른 이메일(other@test.com)에 대해 발급된 것 — target 불일치
        MemberVerification verification = MemberVerification.issue(
                VerificationChannel.EMAIL, "other@test.com", VerificationPurpose.EMAIL_CHANGE,
                "hash", Instant.now().plusSeconds(300), Instant.now().plusSeconds(60));
        verification.markVerified("email-token");

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));
        when(verificationRepository.findByVerificationToken("email-token")).thenReturn(Optional.of(verification));

        assertThatThrownBy(() -> dashboardService.updateProfile(memberId, request))
                .isInstanceOf(CustomException.class);
    }

    @Test
    @DisplayName("프로필 수정 - 이메일/휴대폰 미변경 시 인증 토큰 불필요")
    void updateProfile_unchangedEmailAndPhone_noTokenRequired() throws Exception {
        UUID memberId = UUID.randomUUID();
        Member member = createMember(memberId);

        DashboardDTO.ProfileUpdateRequest request = new DashboardDTO.ProfileUpdateRequest(
                "새이름",
                "user01@test.com",
                "010-1234-5678",
                null,
                null,
                null);

        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));

        DashboardDTO.ProfileResponse response = dashboardService.updateProfile(memberId, request);

        assertThat(response.name()).isEqualTo("새이름");
        assertThat(response.email()).isEqualTo("user01@test.com");
        assertThat(response.phone()).isEqualTo("010-1234-5678");
    }

    private MemberVerification verifiedPhoneChange(String phone, String token) {
        MemberVerification verification = MemberVerification.issue(
                VerificationChannel.PHONE, phone, VerificationPurpose.PHONE_CHANGE,
                "hash", Instant.now().plusSeconds(300), Instant.now().plusSeconds(60));
        verification.markVerified(token);
        return verification;
    }

    @ParameterizedTest
    @CsvSource({
            "https://github.com/career-wave, career-wave",
            "https://www.github.com/career-wave, career-wave",
            "https://github.com/career-wave?tab=repositories, career-wave"
    })
    @DisplayName("GitHub ID 파싱 - 정상 URL")
    void extractGithubId_validGithubUrls_returnGithubId(String githubUrl, String expected) throws Exception {
        assertThat(invokeExtractGithubId(githubUrl)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "https://github.com/|",
            "https://github.com|",
            "https://api.github.com/username|",
            "not-a-url|",
            "https://gitlab.com/username|"
    }, delimiter = '|')
    @DisplayName("GitHub ID 파싱 - 비정상 URL")
    void extractGithubId_invalidUrls_returnNull(String githubUrl, String ignored) throws Exception {
        assertThat(invokeExtractGithubId(githubUrl)).isNull();
    }

    private String invokeExtractGithubId(String githubUrl) throws Exception {
        Method method = DashboardServiceImpl.class.getDeclaredMethod("extractGithubId", String.class);
        method.setAccessible(true);
        return (String) method.invoke(dashboardService, githubUrl);
    }

    private DashboardDTO.GithubResponse invokeToGithubResponse(PersonalProfile personalProfile) throws Exception {
        Method method = DashboardServiceImpl.class.getDeclaredMethod("toGithubResponse", PersonalProfile.class);
        method.setAccessible(true);
        return (DashboardDTO.GithubResponse) method.invoke(dashboardService, personalProfile);
    }

    private Member createMember(UUID memberId) throws Exception {
        var constructor = Member.class.getDeclaredConstructor();
        constructor.setAccessible(true);

        Member member = constructor.newInstance();

        setField(member, "memberId", memberId);
        setField(member, "loginId", "user01");
        setField(member, "email", "user01@test.com");
        setField(member, "phone", "010-1234-5678");
        setField(member, "password", "encoded-password");
        setField(member, "name", "김지원");
        setField(member, "roleType", RoleType.USER);
        setField(member, "memberStatus", MemberStatus.ACTIVE);
        setField(member, "subscriptionStatus", SubscriptionStatus.FREE);
        setField(member, "createdAt", Instant.now());
        setField(member, "updatedAt", Instant.now());

        return member;
    }

    private PersonalProfile createPersonalProfile(UUID memberId, String githubUrl) throws Exception {
        var constructor = PersonalProfile.class.getDeclaredConstructor();
        constructor.setAccessible(true);

        PersonalProfile personalProfile = constructor.newInstance();

        setField(personalProfile, "personalProfileId", 1L);
        setField(personalProfile, "memberId", memberId);
        setField(personalProfile, "githubUrl", githubUrl);
        setField(personalProfile, "createdAt", ZonedDateTime.now());
        setField(personalProfile, "updatedAt", ZonedDateTime.now());

        return personalProfile;
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}