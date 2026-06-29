package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.user.member.entity.MemberTermsDocumentAgreement;
import kr.co.carrer.user.member.entity.TermsDocument;
import kr.co.carrer.user.member.repository.MemberTermsDocumentAgreementRepository;
import kr.co.carrer.user.member.repository.TermsDocumentRepository;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TermsAgreementEvidenceRecorder {

    private final MemberTermsDocumentAgreementRepository agreementRepository;
    private final TermsDocumentRepository termsDocumentRepository;
    private final HttpServletRequest httpServletRequest;

    @Value("${privacy.hash-secret}")
    private String hashSecret;

    public void recordPersonalSignup(UUID memberId, boolean service, boolean privacy, boolean marketing) {
        Instant now = Instant.now();
        String ipHash = hashIp();
        String uaHash = hashUa();
        agreementRepository.saveAll(List.of(
                agreement(memberId, TermsDocumentCode.SERVICE_TERMS, service, now, ipHash, uaHash),
                agreement(memberId, TermsDocumentCode.PRIVACY_COLLECTION, privacy, now, ipHash, uaHash),
                agreement(memberId, TermsDocumentCode.MARKETING, marketing, now, ipHash, uaHash)
        ));
    }

    public void recordCompanySignup(UUID memberId, boolean service, boolean privacy, boolean marketing,
                                    boolean companyVerification, boolean sms) {
        Instant now = Instant.now();
        String ipHash = hashIp();
        String uaHash = hashUa();
        agreementRepository.saveAll(List.of(
                agreement(memberId, TermsDocumentCode.SERVICE_TERMS, service, now, ipHash, uaHash),
                agreement(memberId, TermsDocumentCode.PRIVACY_COLLECTION, privacy, now, ipHash, uaHash),
                agreement(memberId, TermsDocumentCode.COMPANY_VERIFICATION, companyVerification, now, ipHash, uaHash),
                agreement(memberId, TermsDocumentCode.SMS_TERMS, sms, now, ipHash, uaHash),
                agreement(memberId, TermsDocumentCode.MARKETING, marketing, now, ipHash, uaHash)
        ));
    }

    private MemberTermsDocumentAgreement agreement(UUID memberId, TermsDocumentCode code, boolean agreed,
                                                    Instant now, String ipHash, String uaHash) {
        String version = termsDocumentRepository.findLatestEffective(code, now)
                .map(TermsDocument::getVersion)
                .orElseThrow(() -> new CustomException(ErrorCode.TERMS_DOCUMENT_NOT_FOUND));
        return MemberTermsDocumentAgreement.record(memberId, code, version, agreed, now, ipHash, uaHash);
    }

    private String hashIp() {
        return hmac(httpServletRequest.getRemoteAddr());
    }

    private String hashUa() {
        return hmac(httpServletRequest.getHeader("User-Agent"));
    }

    private String hmac(String value) {
        if (value == null) return null;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }
}
