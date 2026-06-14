package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.CsDTO;
import kr.co.carrer.admin.cs.repository.FaqRepository;
import kr.co.carrer.admin.cs.repository.InquiryRepository;
import kr.co.carrer.admin.cs.repository.NoticeRepository;
import kr.co.carrer.admin.cs.service.AdminCsService;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminCsServiceImpl implements AdminCsService {

    private final NoticeRepository noticeRepository;
    private final FaqRepository faqRepository;
    private final InquiryRepository inquiryRepository;

    @Override
    @Transactional(readOnly = true)
    public CsDTO.ResponseSummary getSummary() {
        long noticeCount     = noticeRepository.count();
        long faqCount        = faqRepository.count();
        long pendingCount    = inquiryRepository.countByInquiryStatus(InquiryStatus.PENDING);
        long inProgressCount = inquiryRepository.countByInquiryStatus(InquiryStatus.IN_PROGRESS);
        return new CsDTO.ResponseSummary(noticeCount, faqCount, pendingCount, inProgressCount);
    }
}
