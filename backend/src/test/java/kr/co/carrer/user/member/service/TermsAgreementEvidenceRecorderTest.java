package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.carrer.user.member.entity.MemberTermsDocumentAgreement;
import kr.co.carrer.user.member.entity.TermsDocument;
import kr.co.carrer.user.member.repository.MemberTermsDocumentAgreementRepository;
import kr.co.carrer.user.member.repository.TermsDocumentRepository;
import kr.co.carrer.user.member.type.TermsDocumentCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@SuppressWarnings("unchecked")
class TermsAgreementEvidenceRecorderTest {

    @Mock
    MemberTermsDocumentAgreementRepository agreementRepository;
    @Mock
    TermsDocumentRepository termsDocumentRepository;
    @Mock
    HttpServletRequest httpRequest;

    private static final String TEST_VERSION = "2026-06-26";

    private TermsAgreementEvidenceRecorder recorder() {
        TermsDocument doc = mock(TermsDocument.class);
        when(doc.getVersion()).thenReturn(TEST_VERSION);
        when(termsDocumentRepository.findLatestEffective(any(TermsDocumentCode.class), any(Instant.class)))
                .thenReturn(Optional.of(doc));
        when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
        when(httpRequest.getHeader("User-Agent")).thenReturn("test-agent");

        TermsAgreementEvidenceRecorder recorder =
                new TermsAgreementEvidenceRecorder(agreementRepository, termsDocumentRepository, httpRequest);
        ReflectionTestUtils.setField(recorder, "hashSecret", "test-privacy-hmac-secret");
        return recorder;
    }

    @Test
    void recordPersonalSignup_문서코드와_버전을_저장한다() {
        TermsAgreementEvidenceRecorder recorder = recorder();
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
                    assertThat(agreement.getVersion()).isEqualTo(TEST_VERSION);
                    assertThat(agreement.getAgreedAt()).isNotNull();
                    assertThat(agreement.getIpAddressHash()).isNotNull();
                    assertThat(agreement.getUserAgentHash()).isNotNull();
                });
        assertThat(agreements.get(2).isAgreed()).isFalse();
    }

    @Test
    void recordCompanySignup_기업필수문서와_선택마케팅_증적을_저장한다() {
        TermsAgreementEvidenceRecorder recorder = recorder();
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
