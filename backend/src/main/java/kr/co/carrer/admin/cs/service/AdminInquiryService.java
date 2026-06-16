package kr.co.carrer.admin.cs.service;

import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.global.response.PaginationResponse;

public interface AdminInquiryService {
    PaginationResponse<InquiryDTO.ResponseList> getInquiries(InquiryCategory category, InquiryStatus status, int page, int size);
    InquiryDTO.ResponseDetail getInquiryDetail(Long inquiryId);
    InquiryDTO.ResponseReply saveReply(Long inquiryId, String reply, Long adminId);
    InquiryDTO.ResponseComplete completeInquiry(Long inquiryId);
}
