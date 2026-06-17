package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.entity.Inquiry;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.repository.InquiryQueryRepository;
import kr.co.carrer.admin.cs.repository.InquiryRepository;
import kr.co.carrer.admin.cs.service.AdminInquiryService;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminInquiryServiceImpl implements AdminInquiryService {

    private final InquiryRepository inquiryRepository;
    private final InquiryQueryRepository inquiryQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<InquiryDTO.ResponseList> getInquiries(InquiryCategory category, InquiryStatus status,
                                                                     int page, int size) {
        if (page < 1 || size < 1) throw new CustomException(ErrorCode.BAD_REQUEST);
        size = Math.min(size, 100);
        int offset = (page - 1) * size;
        List<InquiryDTO.ResponseList> items = inquiryQueryRepository.findInquiries(category, status, offset, size);
        long total = inquiryQueryRepository.countInquiries(category, status);
        return PaginationResponse.of(items, page, size, total);
    }

    @Override
    @Transactional(readOnly = true)
    public InquiryDTO.ResponseDetail getInquiryDetail(Long inquiryId) {
        return inquiryQueryRepository.findDetail(inquiryId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.INQUIRY_NOT_FOUND));
    }

    @Override
    @Transactional
    public InquiryDTO.ResponseReply saveReply(Long inquiryId, String reply, Long adminId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.INQUIRY_NOT_FOUND));

        if (inquiry.getInquiryStatus() == InquiryStatus.COMPLETED) {
            throw new CustomException(AdminCsErrorCode.INQUIRY_ALREADY_COMPLETED);
        }

        try {
            inquiry.saveReply(reply, adminId);
            inquiryRepository.saveAndFlush(inquiry);
        } catch (OptimisticLockingFailureException e) {
            throw new CustomException(AdminCsErrorCode.INQUIRY_CONFLICT);
        }

        return new InquiryDTO.ResponseReply(inquiry.getInquiryId(), inquiry.getInquiryStatus(), inquiry.getRepliedAt());
    }

    @Override
    @Transactional
    public InquiryDTO.ResponseComplete completeInquiry(Long inquiryId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.INQUIRY_NOT_FOUND));

        if (inquiry.getInquiryStatus() != InquiryStatus.IN_PROGRESS) {
            throw new CustomException(AdminCsErrorCode.INQUIRY_NOT_IN_PROGRESS);
        }

        try {
            inquiry.complete();
            inquiryRepository.saveAndFlush(inquiry);
        } catch (OptimisticLockingFailureException e) {
            throw new CustomException(AdminCsErrorCode.INQUIRY_CONFLICT);
        }
        return new InquiryDTO.ResponseComplete(inquiry.getInquiryId(), inquiry.getInquiryStatus(), inquiry.getCompletedAt());
    }
}
