package kr.co.carrer.user.support.service.impl;

import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.entity.SupportInquiry;
import kr.co.carrer.user.support.repository.UserInquiryRepository;
import kr.co.carrer.user.support.service.UserInquiryService;
import kr.co.carrer.user.support.type.InquiryCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserInquiryServiceImpl implements UserInquiryService {

    private final UserInquiryRepository inquiryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SupportDTO.InquiryList> getMyInquiries(UUID memberId, InquiryCategory category) {
        return inquiryRepository.findByMemberIdAndCategory(memberId, category)
            .stream()
            .map(i -> new SupportDTO.InquiryList(
                i.getInquiryId(),
                i.getCategory(),
                i.getTitle(),
                truncate(i.getContent(), 100),
                i.getReply(),
                i.getInquiryStatus(),
                i.getCreatedAt()
            ))
            .toList();
    }

    @Override
    @Transactional
    public SupportDTO.ResponseCreateInquiry createInquiry(UUID memberId, SupportDTO.RequestCreateInquiry dto) {
        SupportInquiry inquiry = SupportInquiry.create(memberId, dto.category(), dto.title(), dto.content());
        inquiryRepository.save(inquiry);
        return new SupportDTO.ResponseCreateInquiry(inquiry.getInquiryId(), inquiry.getInquiryStatus());
    }

    private String truncate(String content, int maxLength) {
        if (content == null) return null;
        return content.length() <= maxLength ? content : content.substring(0, maxLength);
    }
}
