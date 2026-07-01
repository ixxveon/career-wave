package kr.co.carrer.user.support.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.InquiryCategory;

import java.util.UUID;

public interface UserInquiryService {

    PaginationResponse<SupportDTO.InquiryList> getMyInquiries(UUID memberId, InquiryCategory category, int page, int size);

    SupportDTO.ResponseCreateInquiry createInquiry(UUID memberId, SupportDTO.RequestCreateInquiry dto);
}
