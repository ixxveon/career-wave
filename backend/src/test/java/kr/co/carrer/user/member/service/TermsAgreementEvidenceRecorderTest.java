package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.entity.MemberTermsDocumentAgreement;
import kr.co.carrer.user.member.repository.MemberTermsDocumentAgreementRepository;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class TermsAgreementEvidenceRecorderTest {

    @Mock
    MemberTermsDocumentAgreementRepository agreementRepository;

    @Test
    void recordPersonalSignup_문서코드와_버전을_저장한다() {
        TermsAgreementEvidenceRecorder recorder = new TermsAgreementEvidenceRecorder(agreementRepository);
        UUID memberId = UUID.randomUUID();

        recorder.recordPersonalSignup(memberId, true, true, false);

        ArgumentCaptor<List<MemberTermsDocumentAgreement>> captor = ArgumentCaptor.forClass(List.class);
        verify(agreementRepository).saveAll(captor.capture());
        List<MemberTermsDocumentAgreement> agreements = captor.getValue();
        assertThat(agreements).hasSize(3);
        assertThat(agreements)
                .extracting(MemberTermsDocumentAgreement::getDocumentCode)
                .containsExactly(
                        TermsDocumentCode.SERVICE_TERMS,
                        TermsDocumentCode.PRIVACY_COLLECTION,
                        TermsDocumentCode.MARKETING);
        assertThat(agreements)
                .allSatisfy(agreement -> {
                    assertThat(agreement.getMemberId()).isEqualTo(memberId);
                    assertThat(agreement.getVersion()).isEqualTo(TermsAgreementEvidenceRecorder.REGISTER_TERMS_VERSION);
                });
        assertThat(agreements.get(2).isAgreed()).isFalse();
    }

    @Test
    void recordCompanySignup_기업필수문서와_선택마케팅_증적을_저장한다() {
        TermsAgreementEvidenceRecorder recorder = new TermsAgreementEvidenceRecorder(agreementRepository);
        UUID memberId = UUID.randomUUID();

        recorder.recordCompanySignup(memberId, true, true, false, true, true);

        ArgumentCaptor<List<MemberTermsDocumentAgreement>> captor = ArgumentCaptor.forClass(List.class);
        verify(agreementRepository).saveAll(captor.capture());
        assertThat(captor.getValue())
                .extracting(MemberTermsDocumentAgreement::getDocumentCode)
                .containsExactly(
                        TermsDocumentCode.SERVICE_TERMS,
                        TermsDocumentCode.PRIVACY_COLLECTION,
                        TermsDocumentCode.COMPANY_VERIFICATION,
                        TermsDocumentCode.SMS_TERMS,
                        TermsDocumentCode.MARKETING);
        assertThat(captor.getValue().get(4).isAgreed()).isFalse();
    }
}
