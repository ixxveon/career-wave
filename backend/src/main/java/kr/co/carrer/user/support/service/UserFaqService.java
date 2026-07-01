package kr.co.carrer.user.support.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.FaqCategory;

public interface UserFaqService {

    PaginationResponse<SupportDTO.FaqItem> getFaqs(FaqCategory category, String keyword, int page, int size);
}
