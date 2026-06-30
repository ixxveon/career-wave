package kr.co.carrer.user.support.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.repository.UserFaqQueryRepository;
import kr.co.carrer.user.support.service.UserFaqService;
import kr.co.carrer.user.support.type.FaqCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserFaqServiceImpl implements UserFaqService {

    private final UserFaqQueryRepository faqQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<SupportDTO.FaqItem> getFaqs(FaqCategory category, String keyword, int page, int size) {
        if (page < 1 || size < 1) throw new CustomException(ErrorCode.BAD_REQUEST);
        size = Math.min(size, 100);
        int offset = (page - 1) * size;

        List<SupportDTO.FaqItem> items = faqQueryRepository.findFaqs(category, keyword, offset, size);
        long total = faqQueryRepository.countFaqs(category, keyword);
        return PaginationResponse.of(items, page, size, total);
    }
}
