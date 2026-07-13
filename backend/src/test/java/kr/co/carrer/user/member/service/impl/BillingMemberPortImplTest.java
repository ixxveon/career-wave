package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.billing.exception.BillingErrorCode;
import kr.co.carrer.user.billing.repository.SubscriptionRepository;
import kr.co.carrer.user.billing.service.BillingMemberPort;
import kr.co.carrer.user.billing.type.SubscriptionStatus;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static kr.co.carrer.user.member.type.SubscriptionStatus.FREE;
import static kr.co.carrer.user.member.type.SubscriptionStatus.PREMIUM;

@ExtendWith(MockitoExtension.class)
class BillingMemberPortImplTest {

    @Mock UserMemberRepository memberRepository;
    @Mock SubscriptionRepository subscriptionRepository;

    private BillingMemberPortImpl impl;
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        impl = new BillingMemberPortImpl(memberRepository, subscriptionRepository);
    }

    // ─── getMemberBillingInfo ────────────────────────────────────────────────

    @Test
    @DisplayName("이메일이 정상 설정된 회원은 MemberBillingInfo를 반환한다")
    void getMemberBillingInfo_success() {
        Member member = memberWithEmail("홍길동", "hong@example.com");
        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

        BillingMemberPort.MemberBillingInfo info = impl.getMemberBillingInfo(memberId);

        assertThat(info.name()).isEqualTo("홍길동");
        assertThat(info.email()).isEqualTo("hong@example.com");
    }

    @Test
    @DisplayName("이메일이 null인 회원 — BILLING_EMAIL_REQUIRED(422)")
    void getMemberBillingInfo_emailNull() {
        Member member = memberWithEmail("카카오유저", null);
        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

        assertThatThrownBy(() -> impl.getMemberBillingInfo(memberId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.BILLING_EMAIL_REQUIRED);
    }

    @Test
    @DisplayName("이메일이 공백 문자열인 회원 — BILLING_EMAIL_REQUIRED(422)")
    void getMemberBillingInfo_emailBlank() {
        Member member = memberWithEmail("카카오유저", "   ");
        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

        assertThatThrownBy(() -> impl.getMemberBillingInfo(memberId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.BILLING_EMAIL_REQUIRED);
    }

    @Test
    @DisplayName("회원을 찾을 수 없는 경우 — ACCOUNT_NOT_ELIGIBLE(403)")
    void getMemberBillingInfo_memberNotFound() {
        given(memberRepository.findById(memberId)).willReturn(Optional.empty());

        assertThatThrownBy(() -> impl.getMemberBillingInfo(memberId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(BillingErrorCode.ACCOUNT_NOT_ELIGIBLE);
    }

    // ─── markPremium ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("markPremium — 회원 subscription_status를 PREMIUM으로 변경한다")
    void markPremium_updatesStatusToPremium() {
        Member member = mock(Member.class);
        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

        impl.markPremium(memberId);

        verify(member).updateSubscriptionStatus(PREMIUM);
    }

    // ─── markFreeIfNoActivePlan ───────────────────────────────────────────────

    @Test
    @DisplayName("유효 구독 없음 → FREE로 변경한다")
    void markFreeIfNoActivePlan_noActiveSub_marksFree() {
        Member member = mock(Member.class);
        given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
        given(subscriptionRepository.existsByMemberIdAndSubscriptionStatusIn(
                eq(memberId), any())).willReturn(false);

        impl.markFreeIfNoActivePlan(memberId);

        verify(member).updateSubscriptionStatus(FREE);
    }

    @Test
    @DisplayName("ACTIVE 구독 존재 → 상태 변경 없음")
    void markFreeIfNoActivePlan_activeSub_noChange() {
        Member member = mock(Member.class);
        given(subscriptionRepository.existsByMemberIdAndSubscriptionStatusIn(
                eq(memberId), any())).willReturn(true);

        impl.markFreeIfNoActivePlan(memberId);

        verify(member, never()).updateSubscriptionStatus(any());
    }

    @Test
    @DisplayName("CANCEL_SCHEDULED 구독 존재 → 상태 변경 없음")
    void markFreeIfNoActivePlan_cancelScheduledSub_noChange() {
        Member member = mock(Member.class);
        given(subscriptionRepository.existsByMemberIdAndSubscriptionStatusIn(
                eq(memberId),
                eq(Set.of(SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCEL_SCHEDULED))
        )).willReturn(true);

        impl.markFreeIfNoActivePlan(memberId);

        verify(member, never()).updateSubscriptionStatus(any());
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private Member memberWithEmail(String name, String email) {
        Member member = mock(Member.class);
        // getName()은 이메일 검증 통과 후에만 호출되므로 lenient로 선언
        org.mockito.Mockito.lenient().when(member.getName()).thenReturn(name);
        given(member.getEmail()).willReturn(email);
        return member;
    }
}
