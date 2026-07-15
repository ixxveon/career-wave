package kr.co.carrer.user.member.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserVerificationDto;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.MemberVerificationRepository;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.service.EmailSenderPort;
import kr.co.carrer.user.member.service.SmsSenderPort;
import kr.co.carrer.user.member.service.UserVerificationService;
import kr.co.carrer.user.member.type.MemberStatus;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import kr.co.carrer.user.member.type.VerificationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserVerificationServiceImpl implements UserVerificationService {

    private static final int CODE_DIGITS = 6;
    private static final long EXPIRES_SECONDS = 300L;      // 5분
    private static final long RESEND_SECONDS  = 60L;       // 60초
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^010[0-9]{8}$");

    private final MemberVerificationRepository verificationRepository;
    private final UserMemberRepository memberRepository;
    private final EmailSenderPort emailSenderPort;
    private final SmsSenderPort smsSenderPort;

    @Override
    @Transactional
    public UserVerificationDto.ResponseSendVerification send(UserVerificationDto.RequestSendVerification request) {
        validateTarget(request.getChannel(), request.getTarget());

        Instant now = Instant.now();

        // 재발송 rate limit — 60초 내 동일 target+purpose 발송 제한
        verificationRepository
                .findTopByTargetAndPurposeOrderByCreatedAtDesc(request.getTarget(), request.getPurpose())
                .ifPresent(prev -> {
                    if (now.isBefore(prev.getResendAvailableAt())) {
                        throw new CustomException(UserAuthErrorCode.VERIFICATION_RATE_LIMITED);
                    }
                });
        validateRegisterTargetAvailable(request);

        String code = generateCode();
        String codeHash = hash(code);
        Instant expiresAt = now.plusSeconds(EXPIRES_SECONDS);
        Instant resendAvailableAt = now.plusSeconds(RESEND_SECONDS);

        MemberVerification verification = MemberVerification.issue(
                request.getChannel(), request.getTarget(),
                request.getPurpose(), codeHash, expiresAt, resendAvailableAt);
        verificationRepository.save(verification);

        // 인증번호 발송 — 로그에 코드 미노출 (NFR-002)
        if (request.getChannel() == VerificationChannel.EMAIL) {
            emailSenderPort.sendVerificationCode(request.getTarget(), code);
        } else {
            smsSenderPort.sendVerificationCode(request.getTarget(), code);
        }

        return new UserVerificationDto.ResponseSendVerification(
                verification.getVerificationId(),
                expiresAt,
                resendAvailableAt,
                verification.getRemainingAttempts());
    }

    @Override
    @Transactional(noRollbackFor = {CustomException.class})
    public UserVerificationDto.ResponseConfirmVerification confirm(UserVerificationDto.RequestConfirmVerification request) {
        MemberVerification verification = verificationRepository
                .findByVerificationId(request.getVerificationId())
                .orElseThrow(() -> new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID));

        // 만료 여부
        if (!Instant.now().isBefore(verification.getExpiresAt())) {
            verification.expire();
            throw new CustomException(UserAuthErrorCode.VERIFICATION_EXPIRED);
        }

        // 이미 완료·차단 상태
        if (verification.getVerificationStatus() == VerificationStatus.VERIFIED) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        if (verification.getVerificationStatus() == VerificationStatus.RATE_LIMITED
                || verification.getRemainingAttempts() <= 0) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_RATE_LIMITED);
        }

        // 코드 검증
        if (!hash(request.getCode()).equals(verification.getCodeHash())) {
            verification.decrementAttempts();
            if (verification.getRemainingAttempts() <= 0) {
                throw new CustomException(UserAuthErrorCode.VERIFICATION_RATE_LIMITED);
            }
            throw new CustomException(UserAuthErrorCode.INVALID_VERIFICATION_CODE);
        }

        // 인증 성공 — verificationToken 발급 및 저장
        String verificationToken = generateVerificationToken();
        verification.markVerified(verificationToken);

        return new UserVerificationDto.ResponseConfirmVerification(
                verificationToken,
                verification.getVerifiedAt());
    }

    // ── 내부 유틸 ─────────────────────────────────────────────────────────────

    private void validateTarget(VerificationChannel channel, String target) {
        if (channel == null || target == null || target.isBlank()) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        }
        if (channel != VerificationChannel.EMAIL && channel != VerificationChannel.PHONE) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        }
        if (channel == VerificationChannel.EMAIL && !EMAIL_PATTERN.matcher(target).matches()) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        }
        if (channel == VerificationChannel.PHONE && !PHONE_PATTERN.matcher(target).matches()) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TARGET_INVALID);
        }
    }

    // REGISTER(신규 가입) 및 EMAIL_CHANGE/PHONE_CHANGE(마이페이지 변경)는 target이
    // 다른 회원에게 이미 사용 중이면 안 된다 — SOCIAL_SIGNUP은 기존 가입 번호도 허용해야 하므로 제외.
    private void validateRegisterTargetAvailable(UserVerificationDto.RequestSendVerification request) {
        VerificationPurpose purpose = request.getPurpose();
        if (purpose != VerificationPurpose.REGISTER
                && purpose != VerificationPurpose.EMAIL_CHANGE
                && purpose != VerificationPurpose.PHONE_CHANGE) {
            return;
        }
        if (request.getChannel() == VerificationChannel.EMAIL
                && memberRepository.existsByEmailAndMemberStatusNot(request.getTarget(), MemberStatus.WITHDRAWN)) {
            throw new CustomException(UserAuthErrorCode.EMAIL_ALREADY_EXISTS);
        }
        if (request.getChannel() == VerificationChannel.PHONE
                && memberRepository.existsByPhoneAndMemberStatusNot(request.getTarget(), MemberStatus.WITHDRAWN)) {
            throw new CustomException(UserAuthErrorCode.PHONE_ALREADY_EXISTS);
        }
    }

    private static String generateCode() {
        int code = new SecureRandom().nextInt(900000) + 100000;
        return String.valueOf(code);
    }

    private static String generateVerificationToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(
                    digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
