package kr.co.carrer.user.support.service.impl;

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
    public List<SupportDTO.FaqItem> getFaqs(FaqCategory category, String keyword) {
        return faqQueryRepository.findFaqs(category, keyword);
    }
}
