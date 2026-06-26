package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.entity.MemberTermsDocumentAgreement;
import kr.co.carrer.user.member.repository.MemberTermsDocumentAgreementRepository;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TermsAgreementEvidenceRecorder {
    public static final String REGISTER_TERMS_VERSION = "2026-06-26";

    private final MemberTermsDocumentAgreementRepository agreementRepository;

    public void recordPersonalSignup(UUID memberId, boolean service, boolean privacy, boolean marketing) {
        agreementRepository.saveAll(List.of(
                agreement(memberId, TermsDocumentCode.SERVICE_TERMS, service),
                agreement(memberId, TermsDocumentCode.PRIVACY_COLLECTION, privacy),
                agreement(memberId, TermsDocumentCode.MARKETING, marketing)
        ));
    }

    public void recordCompanySignup(UUID memberId, boolean service, boolean privacy, boolean marketing,
                                    boolean companyVerification, boolean sms) {
        agreementRepository.saveAll(List.of(
                agreement(memberId, TermsDocumentCode.SERVICE_TERMS, service),
                agreement(memberId, TermsDocumentCode.PRIVACY_COLLECTION, privacy),
                agreement(memberId, TermsDocumentCode.COMPANY_VERIFICATION, companyVerification),
                agreement(memberId, TermsDocumentCode.SMS_TERMS, sms),
                agreement(memberId, TermsDocumentCode.MARKETING, marketing)
        ));
    }

    private MemberTermsDocumentAgreement agreement(UUID memberId, TermsDocumentCode documentCode, boolean agreed) {
        return MemberTermsDocumentAgreement.record(memberId, documentCode, REGISTER_TERMS_VERSION, agreed);
    }
}
