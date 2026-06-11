package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.entity.Notice;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.repository.NoticeQueryRepository;
import kr.co.carrer.admin.cs.repository.NoticeRepository;
import kr.co.carrer.admin.cs.service.AdminNoticeService;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminNoticeServiceImpl implements AdminNoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeQueryRepository noticeQueryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<NoticeDTO.ResponseList> getNotices(NoticeCategory category, Boolean visible,
                                                                  String keyword, int page, int size) {
        size = Math.min(size, 100);
        int offset = (page - 1) * size;
        List<NoticeDTO.ResponseList> items = noticeQueryRepository.findNotices(category, visible, keyword, offset, size);
        long total = noticeQueryRepository.countNotices(category, visible, keyword);
        return PaginationResponse.of(items, page, size, total);
    }

    @Override
    @Transactional(readOnly = true)
    public NoticeDTO.ResponseDetail getNoticeDetail(Long noticeId) {
        return noticeQueryRepository.findDetail(noticeId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.NOTICE_NOT_FOUND));
    }

    @Override
    @Transactional
    public NoticeDTO.ResponseResult createNotice(NoticeDTO.RequestCreate dto, Long adminId) {
        Notice notice = Notice.create(adminId, dto.category(), dto.title(), dto.content(), dto.isVisible());
        noticeRepository.save(notice);
        return new NoticeDTO.ResponseResult(notice.getNoticeId(), null);
    }

    @Override
    @Transactional
    public NoticeDTO.ResponseResult updateNotice(Long noticeId, NoticeDTO.RequestUpdate dto) {
        Notice notice = noticeRepository.findById(noticeId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.NOTICE_NOT_FOUND));
        notice.update(dto.category(), dto.title(), dto.content(), dto.isVisible());
        return new NoticeDTO.ResponseResult(notice.getNoticeId(), notice.getUpdatedAt());
    }

    @Override
    @Transactional
    public void deleteNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
            .orElseThrow(() -> new CustomException(AdminCsErrorCode.NOTICE_NOT_FOUND));
        noticeRepository.delete(notice);
    }
}
