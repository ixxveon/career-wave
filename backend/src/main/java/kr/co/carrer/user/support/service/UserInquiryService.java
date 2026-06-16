package kr.co.carrer.user.support.service;

import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.InquiryCategory;

import java.util.List;
import java.util.UUID;

public interface UserInquiryService {

    List<SupportDTO.InquiryList> getMyInquiries(UUID memberId, InquiryCategory category);

    SupportDTO.ResponseCreateInquiry createInquiry(UUID memberId, SupportDTO.RequestCreateInquiry dto);
}
