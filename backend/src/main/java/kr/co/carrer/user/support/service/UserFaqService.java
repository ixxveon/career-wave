package kr.co.carrer.user.support.service;

import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.FaqCategory;

import java.util.List;

public interface UserFaqService {

    List<SupportDTO.FaqItem> getFaqs(FaqCategory category, String keyword);
}
