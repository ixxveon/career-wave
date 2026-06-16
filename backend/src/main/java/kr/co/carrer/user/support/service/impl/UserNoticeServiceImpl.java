package kr.co.carrer.user.support.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.exception.UserSupportErrorCode;
import kr.co.carrer.user.support.repository.UserNoticeQueryRepository;
import kr.co.carrer.user.support.repository.UserNoticeRepository;
import kr.co.carrer.user.support.service.UserNoticeService;
import kr.co.carrer.user.support.type.NoticeCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserNoticeServiceImpl implements UserNoticeService {

    private final UserNoticeRepository noticeRepository;
    private final UserNoticeQueryRepository noticeQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<SupportDTO.NoticeList> getNotices(NoticeCategory category, String keyword, int page, int size) {
        if (page < 1 || size < 1) throw new CustomException(ErrorCode.BAD_REQUEST);
        size = Math.min(size, 100);
        int offset = (page - 1) * size;

        List<SupportDTO.NoticeList> items = noticeQueryRepository.findNotices(category, keyword, offset, size);
        long total = noticeQueryRepository.countNotices(category, keyword);
        return PaginationResponse.of(items, page, size, total);
    }

    @Override
    @Transactional
    public SupportDTO.NoticeDetail getNoticeDetail(Long noticeId) {
        SupportDTO.NoticeDetail detail = noticeQueryRepository.findDetail(noticeId)
            .orElseThrow(() -> new CustomException(UserSupportErrorCode.NOTICE_NOT_FOUND));

        noticeRepository.incrementViewCountById(noticeId);
        return detail;
    }
}
