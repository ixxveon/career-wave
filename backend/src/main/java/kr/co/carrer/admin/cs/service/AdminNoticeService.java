package kr.co.carrer.admin.cs.service;

import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.global.response.PaginationResponse;

public interface AdminNoticeService {
    PaginationResponse<NoticeDTO.ResponseList> getNotices(NoticeCategory category, Boolean visible, String keyword, int page, int size);
    NoticeDTO.ResponseDetail getNoticeDetail(Long noticeId);
    NoticeDTO.ResponseResult createNotice(NoticeDTO.RequestCreate dto, Long adminId);
    NoticeDTO.ResponseResult updateNotice(Long noticeId, NoticeDTO.RequestUpdate dto);
    void deleteNotice(Long noticeId);
}
