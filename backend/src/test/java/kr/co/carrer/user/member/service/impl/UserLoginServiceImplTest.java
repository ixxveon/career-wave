package kr.co.carrer.user.member.service.impl;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.jwt.CookieProperties;
import kr.co.carrer.auth.jwt.JwtProperties;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.store.RefreshTokenStore;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.MemberType;
import kr.co.carrer.user.member.type.RoleType;
import kr.co.carrer.user.member.type.SubscriptionStatus;
import kr.co.carrer.user.member.dto.UserLoginDto;
import kr.co.carrer.user.member.service.UserLoginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserLoginServiceImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock HttpServletResponse httpResponse;
    @Mock RefreshTokenStore refreshTokenStore;
    @Mock TokenBlacklistStore tokenBlacklistStore;
    @Mock kr.co.carrer.auth.store.LoginAttemptStore loginAttemptStore;
    @Mock kr.co.carrer.user.member.repository.UserMemberStatusQueryRepository statusQueryRepository;

    private UserLoginService service;
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.getUser().setSecret("test-user-secret-key-must-be-at-least-32-bytes!!");
        props.getUser().setAccessExpiration(1800000L);
        props.getUser().setRefreshExpiration(1209600000L);
        props.getAdmin().setSecret("test-admin-secret-key-must-be-at-least-32-bytes!");
        props.getAdmin().setAccessExpiration(900000L);
        props.getAdmin().setRefreshExpiration(86400000L);
        JwtTokenProvider provider = new JwtTokenProvider(props);
        service = new UserLoginServiceImpl(memberRepository, encoder, provider, props, refreshTokenStore, tokenBlacklistStore, loginAttemptStore, statusQueryRepository, new CookieProperties());
        // loginAttemptStore 기본 stub — 실패 카운트 테스트가 아닌 경우 5회 미만으로 설정
        lenient().when(loginAttemptStore.increment(any(), anyString())).thenReturn(1L);
        lenient().when(loginAttemptStore.getMaxAttempts()).thenReturn(5);
    }

    private Member createMember(RoleType roleType, MemberStatus status) throws Exception {
        var ctor = Member.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        Member m = ctor.newInstance();
        setField(m, "memberId", UUID.randomUUID());
        setField(m, "loginId", "user01");
        setField(m, "password", encoder.encode("password123"));
        setField(m, "name", "홍길동");
        setField(m, "roleType", roleType);
        setField(m, "memberStatus", status);
        setField(m, "subscriptionStatus", SubscriptionStatus.FREE);
        return m;
    }

    private void setField(Object obj, String fieldName, Object value) throws Exception {
        Field field = obj.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(obj, value);
    }

    @Test
    void 정상_로그인_USER_accessToken_반환() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);
        UserLoginDto.Response result = service.login(req, httpResponse);

        assertThat(result.getAccessToken()).isNotBlank();
        assertThat(result.getMember().getRoleType()).isEqualTo("USER");
    }

    @Test
    void 개인회원_로그인_companyApprovalStatus_NONE_반환_및_DB_미조회() throws Exception {
        // given — USER 회원: hr_managers row 없음 → NONE은 DB 저장값이 아닌 API 응답 전용 가상값 (spec §1.4)
        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);
        UserLoginDto.Response result = service.login(req, httpResponse);

        // companyApprovalStatus=NONE 반환 확인
        assertThat(result.getMember().getCompanyApprovalStatus()).isEqualTo("NONE");

        // statusQueryRepository(hr_managers 조회)가 호출되지 않았는지 확인 — NONE은 DB에 저장되지 않는 가상값
        verify(statusQueryRepository, never()).findCompanyHrStatus(any());
        verify(statusQueryRepository, never()).findCompanyApprovalStatus(any());
    }

    @Test
    void 존재하지_않는_아이디_AUTH_INVALID_CREDENTIALS() {
        when(memberRepository.findByLoginId(anyString())).thenReturn(Optional.empty());
        UserLoginDto.Request req = new UserLoginDto.Request("wrong", "pw", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void 비밀번호_불일치_AUTH_INVALID_CREDENTIALS() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "wrongpw", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void roleType_불일치_AUTH_INVALID_CREDENTIALS() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.COMPANY);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    @Test
    void SUSPENDED_계정_AUTH_ACCOUNT_SUSPENDED() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.SUSPENDED);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
    }

    @Test
    void BANNED_계정_AUTH_ACCOUNT_BANNED() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.BANNED);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
    }

    @Test
    void BLACKLISTED_계정_AUTH_ACCOUNT_BLACKLISTED() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.BLACKLISTED);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_BLACKLISTED);
    }

    @Test
    void WITHDRAWN_계정_AUTH_ACCOUNT_WITHDRAWN() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.WITHDRAWN);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
    }

    @Test
    void APPROVED_기업회원_로그인_성공() throws Exception {
        Member member = createMember(RoleType.COMPANY, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        when(statusQueryRepository.findCompanyHrStatus(member.getMemberId()))
                .thenReturn("APPROVED");

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.COMPANY);
        UserLoginDto.Response result = service.login(req, httpResponse);

        assertThat(result.getAccessToken()).isNotBlank();
        assertThat(result.getMember().getCompanyApprovalStatus()).isEqualTo("APPROVED");
    }

    @Test
    void PENDING_REVIEW_기업회원_AUTH_COMPANY_PENDING_REVIEW() throws Exception {
        Member member = createMember(RoleType.COMPANY, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));
        when(statusQueryRepository.findCompanyHrStatus(member.getMemberId()))
                .thenReturn("PENDING_REVIEW");

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.COMPANY);

        assertThatThrownBy(() -> service.login(req, httpResponse))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserAuthErrorCode.AUTH_COMPANY_PENDING_REVIEW);
    }

    @Test
    void USER_5세션_상한_초과_시_오래된_세션_퇴출() throws Exception {
        Member member = createMember(RoleType.USER, MemberStatus.ACTIVE);
        when(memberRepository.findByLoginId("user01")).thenReturn(Optional.of(member));

        String oldSessionKey = "refresh:USER:" + member.getMemberId() + ":old-session-id";
        when(refreshTokenStore.enforceSessionLimit(eq(AccountType.USER), anyString()))
                .thenReturn(List.of(oldSessionKey));
        when(refreshTokenStore.getAndDeleteAccessJti(eq(AccountType.USER), anyString(), eq("old-session-id")))
                .thenReturn("old-jti");

        UserLoginDto.Request req = new UserLoginDto.Request("user01", "password123", MemberType.USER);
        service.login(req, httpResponse);

        verify(tokenBlacklistStore).add(eq("old-jti"), any());
        verify(refreshTokenStore).delete(eq(AccountType.USER), anyString(), eq("old-session-id"));
    }
}
