package kr.co.carrer.admin.cs.service;

import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.admin.cs.type.FaqCategory;
import kr.co.carrer.global.response.PaginationResponse;

public interface AdminFaqService {
    PaginationResponse<FaqDTO.ResponseList> getFaqs(FaqCategory category, int page, int size);
    FaqDTO.ResponseResult createFaq(FaqDTO.RequestCreate dto, Long adminId);
    FaqDTO.ResponseResult updateFaq(Long faqId, FaqDTO.RequestUpdate dto);
    void deleteFaq(Long faqId);
}
