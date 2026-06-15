package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.CsDTO;
import kr.co.carrer.admin.cs.repository.FaqRepository;
import kr.co.carrer.admin.cs.repository.InquiryRepository;
import kr.co.carrer.admin.cs.repository.NoticeRepository;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AdminCsServiceImplTest {

    @InjectMocks
    private AdminCsServiceImpl adminCsService;

    @Mock private NoticeRepository noticeRepository;
    @Mock private FaqRepository faqRepository;
    @Mock private InquiryRepository inquiryRepository;

    @Test
    @DisplayName("KPI 집계 - 공지·FAQ·문의 건수 합산 성공")
    void getSummary_success() {
        given(noticeRepository.count()).willReturn(5L);
        given(faqRepository.count()).willReturn(12L);
        given(inquiryRepository.countByInquiryStatus(InquiryStatus.PENDING)).willReturn(3L);
        given(inquiryRepository.countByInquiryStatus(InquiryStatus.IN_PROGRESS)).willReturn(2L);

        CsDTO.ResponseSummary result = adminCsService.getSummary();

        assertThat(result.noticeCount()).isEqualTo(5L);
        assertThat(result.faqCount()).isEqualTo(12L);
        assertThat(result.pendingCount()).isEqualTo(3L);
        assertThat(result.inProgressCount()).isEqualTo(2L);
    }
}
