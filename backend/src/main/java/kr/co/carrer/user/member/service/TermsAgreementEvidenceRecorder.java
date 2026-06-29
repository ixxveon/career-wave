package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.carrer.user.member.entity.MemberTermsDocumentAgreement;
import kr.co.carrer.user.member.entity.TermsDocument;
import kr.co.carrer.user.member.repository.MemberTermsDocumentAgreementRepository;
import kr.co.carrer.user.member.repository.TermsDocumentRepository;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TermsAgreementEvidenceRecorder {

    private final MemberTermsDocumentAgreementRepository agreementRepository;
    private final TermsDocumentRepository termsDocumentRepository;
    private final HttpServletRequest httpServletRequest;

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
                .orElseThrow(() -> new IllegalStateException(
                        "No effective terms document found for code: " + code));
        return MemberTermsDocumentAgreement.record(memberId, code, version, agreed, ipHash, uaHash);
    }

    private String hashIp() {
        String ip = httpServletRequest.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = httpServletRequest.getRemoteAddr();
        } else if (ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return sha256(ip);
    }

    private String hashUa() {
        return sha256(httpServletRequest.getHeader("User-Agent"));
    }

    private static String sha256(String value) {
        if (value == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(64);
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
