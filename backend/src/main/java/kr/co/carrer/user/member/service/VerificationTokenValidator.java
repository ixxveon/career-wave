package kr.co.carrer.user.member.service;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import kr.co.carrer.user.member.type.VerificationStatus;

import java.time.Instant;

// verificationToken purpose/target/channel/expiry/status 복합 검증 — 가입/복구/소셜연동/
// 마이페이지 정보 변경 등 여러 도메인 service에서 공통으로 호출한다. 특정 Impl 클래스에
// 종속되지 않도록 별도 유틸로 분리했다 (#1307).
public final class VerificationTokenValidator {

    private VerificationTokenValidator() {
    }

    public static void validate(
            MemberVerification verification,
            VerificationChannel expectedChannel,
            String expectedTarget,
            VerificationPurpose expectedPurpose) {
        if (verification.getVerificationStatus() != VerificationStatus.VERIFIED) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        if (!Instant.now().isBefore(verification.getExpiresAt())) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        if (verification.getChannel() != expectedChannel) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        if (!verification.getTarget().equals(expectedTarget)) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        if (verification.getPurpose() != expectedPurpose) {
            throw new CustomException(UserAuthErrorCode.VERIFICATION_TOKEN_INVALID);
        }
    }
}
