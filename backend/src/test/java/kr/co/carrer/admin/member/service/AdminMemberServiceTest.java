package kr.co.carrer.admin.member.service;

import kr.co.carrer.admin.member.dto.HrManagerDTO;
import kr.co.carrer.admin.member.dto.MemberDTO;
import kr.co.carrer.admin.member.entity.HrManager;
import kr.co.carrer.admin.member.entity.Member;
import kr.co.carrer.admin.member.entity.SuspendHistory;
import kr.co.carrer.admin.member.repository.HrManagerRepository;
import kr.co.carrer.admin.member.repository.MemberQueryRepository;
import kr.co.carrer.admin.member.repository.MemberRepository;
import kr.co.carrer.admin.member.repository.SuspendHistoryRepository;
import kr.co.carrer.admin.member.type.HrStatus;
import kr.co.carrer.admin.member.type.MemberStatus;
import kr.co.carrer.admin.member.type.SanctionType;
import kr.co.carrer.admin.member.type.SuspendDuration;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminMemberServiceTest {

    @InjectMocks
    private AdminMemberServiceImpl adminMemberService;

    @Mock private MemberRepository memberRepository;
    @Mock private MemberQueryRepository memberQueryRepository;
    @Mock private HrManagerRepository hrManagerRepository;
    @Mock private SuspendHistoryRepository suspendHistoryRepository;

    @Nested
    @DisplayName("회원 제재 처리 - sanctionMember()")
    class SanctionMember {

        @Test
        @DisplayName("WARNING 제재 - 경고 횟수 증가")
        void warning_success() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
            given(suspendHistoryRepository.save(any())).willAnswer(i -> i.getArgument(0));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.WARNING, null, "커뮤니티 규정 반복 위반으로 경고 처리합니다."
            );

            MemberDTO.ResponseSanction result = adminMemberService.sanctionMember(memberId, request, 1L);

            assertThat(result.sanctionType()).isEqualTo(SanctionType.WARNING);
            assertThat(member.getWarningCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("SUSPEND 제재 - 정지 종료일 계산 (THREE_DAYS)")
        void suspend_threeDays_success() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
            given(suspendHistoryRepository.save(any())).willAnswer(i -> i.getArgument(0));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.SUSPEND, SuspendDuration.THREE_DAYS, "스팸 게시글 반복 작성으로 3일 정지합니다."
            );

            MemberDTO.ResponseSanction result = adminMemberService.sanctionMember(memberId, request, 1L);

            assertThat(result.memberStatus()).isEqualTo(MemberStatus.SUSPENDED);
            assertThat(result.endDate()).isEqualTo(LocalDate.now().plusDays(3));
        }

        @Test
        @DisplayName("BLACKLIST 제재 - 영구 정지 처리")
        void blacklist_success() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
            given(suspendHistoryRepository.save(any())).willAnswer(i -> i.getArgument(0));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.BLACKLIST, null, "사기 행위 확인으로 영구 정지 처리합니다."
            );

            MemberDTO.ResponseSanction result = adminMemberService.sanctionMember(memberId, request, 1L);

            assertThat(result.memberStatus()).isEqualTo(MemberStatus.BANNED);
        }

        @Test
        @DisplayName("SUSPEND에 PERMANENT 지정 시 INVALID_SANCTION_DURATION 예외")
        void suspend_permanent_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.SUSPEND, SuspendDuration.PERMANENT, "테스트 사유입니다. 최소 열 글자."
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_SANCTION_DURATION);
        }

        @Test
        @DisplayName("SUSPEND에 duration null 지정 시 INVALID_SANCTION_DURATION 예외")
        void suspend_nullDuration_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.SUSPEND, null, "테스트 사유입니다. 최소 열 글자."
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_SANCTION_DURATION);
        }

        @Test
        @DisplayName("이미 BANNED 회원 제재 시 ALREADY_BANNED 예외")
        void alreadyBanned_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createBannedMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.WARNING, null, "테스트 사유입니다. 최소 열 글자."
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.ALREADY_BANNED);
        }

        @Test
        @DisplayName("제재 사유 null 시 REASON_REQUIRED 예외")
        void reason_null_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.WARNING, null, null
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.REASON_REQUIRED);
        }

        @Test
        @DisplayName("제재 사유 10자 미만 시 REASON_TOO_SHORT 예외")
        void reason_tooShort_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createActiveMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.WARNING, null, "짧음"
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.REASON_TOO_SHORT);
        }

        @Test
        @DisplayName("이미 SUSPENDED 회원에게 SUSPEND 시 ALREADY_SUSPENDED 예외")
        void suspend_alreadySuspended_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createSuspendedMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.SUSPEND, SuspendDuration.THREE_DAYS, "테스트 사유입니다. 최소 열 글자."
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.ALREADY_SUSPENDED);
        }

        @Test
        @DisplayName("경고 3회 누적 회원에게 WARNING 시 MAX_WARNING_EXCEEDED 예외")
        void warning_maxExceeded_throws() {
            UUID memberId = UUID.randomUUID();
            Member member = createMaxWarnedMember(memberId);
            given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.WARNING, null, "테스트 사유입니다. 최소 열 글자."
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.MAX_WARNING_EXCEEDED);
        }

        @Test
        @DisplayName("존재하지 않는 회원 제재 시 MEMBER_NOT_FOUND 예외")
        void memberNotFound_throws() {
            UUID memberId = UUID.randomUUID();
            given(memberRepository.findById(memberId)).willReturn(Optional.empty());

            MemberDTO.RequestSanction request = new MemberDTO.RequestSanction(
                SanctionType.WARNING, null, "테스트 사유입니다. 최소 열 글자."
            );

            assertThatThrownBy(() -> adminMemberService.sanctionMember(memberId, request, 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("기업 회원 승인 - approveHrManager()")
    class ApproveHrManager {

        @Test
        @DisplayName("PENDING 상태 기업 회원 승인 성공")
        void approve_success() {
            UUID memberId = UUID.randomUUID();
            HrManager hrManager = createPendingHrManager(memberId);
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.of(hrManager));

            HrManagerDTO.ResponseApprove result = adminMemberService.approveHrManager(memberId);

            assertThat(result.hrStatus()).isEqualTo(HrStatus.ACTIVE);
            assertThat(result.approvedAt()).isNotNull();
        }

        @Test
        @DisplayName("이미 처리된 기업 회원 승인 시 ALREADY_PROCESSED 예외")
        void alreadyProcessed_throws() {
            UUID memberId = UUID.randomUUID();
            HrManager hrManager = createActiveHrManager(memberId);
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.of(hrManager));

            assertThatThrownBy(() -> adminMemberService.approveHrManager(memberId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.ALREADY_PROCESSED);
        }

        @Test
        @DisplayName("존재하지 않는 기업 회원 승인 시 HR_MANAGER_NOT_FOUND 예외")
        void hrManagerNotFound_throws() {
            UUID memberId = UUID.randomUUID();
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminMemberService.approveHrManager(memberId))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.HR_MANAGER_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("기업 회원 반려 - rejectHrManager()")
    class RejectHrManager {

        @Test
        @DisplayName("PENDING 상태 기업 회원 반려 성공")
        void reject_success() {
            UUID memberId = UUID.randomUUID();
            HrManager hrManager = createPendingHrManager(memberId);
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.of(hrManager));

            HrManagerDTO.RequestReject request = new HrManagerDTO.RequestReject("사업자등록증 서류 미비로 반려 처리합니다.");

            HrManagerDTO.ResponseReject result = adminMemberService.rejectHrManager(memberId, request);

            assertThat(result.hrStatus()).isEqualTo(HrStatus.REMOVED);
            assertThat(result.rejectReason()).isEqualTo("사업자등록증 서류 미비로 반려 처리합니다.");
        }

        @Test
        @DisplayName("이미 처리된 기업 회원 반려 시 ALREADY_PROCESSED 예외")
        void alreadyProcessed_throws() {
            UUID memberId = UUID.randomUUID();
            HrManager hrManager = createActiveHrManager(memberId);
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.of(hrManager));

            HrManagerDTO.RequestReject request = new HrManagerDTO.RequestReject("사업자등록증 서류 미비로 반려 처리합니다.");

            assertThatThrownBy(() -> adminMemberService.rejectHrManager(memberId, request))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.ALREADY_PROCESSED);
        }

        @Test
        @DisplayName("반려 사유 null 시 REASON_REQUIRED 예외")
        void reason_null_throws() {
            UUID memberId = UUID.randomUUID();
            HrManager hrManager = createPendingHrManager(memberId);
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.of(hrManager));

            HrManagerDTO.RequestReject request = new HrManagerDTO.RequestReject(null);

            assertThatThrownBy(() -> adminMemberService.rejectHrManager(memberId, request))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.REASON_REQUIRED);
        }

        @Test
        @DisplayName("반려 사유 10자 미만 시 REASON_TOO_SHORT 예외")
        void reason_tooShort_throws() {
            UUID memberId = UUID.randomUUID();
            HrManager hrManager = createPendingHrManager(memberId);
            given(hrManagerRepository.findByMemberId(memberId)).willReturn(Optional.of(hrManager));

            HrManagerDTO.RequestReject request = new HrManagerDTO.RequestReject("짧음");

            assertThatThrownBy(() -> adminMemberService.rejectHrManager(memberId, request))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.REASON_TOO_SHORT);
        }
    }

    // ── 테스트용 객체 생성 헬퍼 ──────────────────────────────────────────────

    private Member createActiveMember(UUID memberId) {
        try {
            var constructor = Member.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Member member = constructor.newInstance();

            setField(member, "memberId", memberId);
            setField(member, "memberStatus", MemberStatus.ACTIVE);
            setField(member, "warningCount", 0);
            return member;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Member createSuspendedMember(UUID memberId) {
        try {
            var constructor = Member.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Member member = constructor.newInstance();

            setField(member, "memberId", memberId);
            setField(member, "memberStatus", MemberStatus.SUSPENDED);
            setField(member, "warningCount", 0);
            return member;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Member createMaxWarnedMember(UUID memberId) {
        try {
            var constructor = Member.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Member member = constructor.newInstance();

            setField(member, "memberId", memberId);
            setField(member, "memberStatus", MemberStatus.ACTIVE);
            setField(member, "warningCount", 3);
            return member;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Member createBannedMember(UUID memberId) {
        try {
            var constructor = Member.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Member member = constructor.newInstance();

            setField(member, "memberId", memberId);
            setField(member, "memberStatus", MemberStatus.BANNED);
            setField(member, "warningCount", 0);
            return member;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private HrManager createPendingHrManager(UUID memberId) {
        try {
            var constructor = HrManager.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            HrManager hrManager = constructor.newInstance();

            setField(hrManager, "memberId", memberId);
            setField(hrManager, "hrStatus", HrStatus.PENDING);
            return hrManager;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private HrManager createActiveHrManager(UUID memberId) {
        try {
            var constructor = HrManager.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            HrManager hrManager = constructor.newInstance();

            setField(hrManager, "memberId", memberId);
            setField(hrManager, "hrStatus", HrStatus.ACTIVE);
            return hrManager;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
