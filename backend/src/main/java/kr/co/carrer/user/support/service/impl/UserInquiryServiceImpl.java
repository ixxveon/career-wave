package kr.co.carrer.user.support.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.entity.SupportInquiry;
import kr.co.carrer.user.support.exception.UserSupportErrorCode;
import kr.co.carrer.user.support.repository.UserInquiryRepository;
import kr.co.carrer.user.support.service.UserInquiryService;
import kr.co.carrer.user.support.type.InquiryCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    public PaginationResponse<SupportDTO.InquiryList> getMyInquiries(UUID memberId, InquiryCategory category, int page, int size) {
        if (page < 1 || size < 1) throw new CustomException(ErrorCode.BAD_REQUEST);
        size = Math.min(size, 100);

        Page<SupportInquiry> result = inquiryRepository.findByMemberIdAndCategory(memberId, category, PageRequest.of(page - 1, size));
        List<SupportDTO.InquiryList> items = result.getContent().stream()
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
        return PaginationResponse.of(items, page, size, result.getTotalElements());
    }

    @Override
    @Transactional
    public SupportDTO.ResponseCreateInquiry createInquiry(UUID memberId, SupportDTO.RequestCreateInquiry dto) {
        if (dto.content().length() < 10) {
            throw new CustomException(UserSupportErrorCode.INVALID_INQUIRY_CONTENT);
        }
        SupportInquiry inquiry = SupportInquiry.create(memberId, dto.category(), dto.title(), dto.content());
        SupportInquiry saved = inquiryRepository.save(inquiry);
        return new SupportDTO.ResponseCreateInquiry(saved.getInquiryId(), saved.getInquiryStatus());
    }

    private String truncate(String content, int maxLength) {
        if (content == null) return null;
        return content.length() <= maxLength ? content : content.substring(0, maxLength);
    }
}
