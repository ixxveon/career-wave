package kr.co.carrer.user.support.service;

import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.type.NoticeCategory;
import kr.co.carrer.global.response.PaginationResponse;

public interface UserNoticeService {

    PaginationResponse<SupportDTO.NoticeList> getNotices(NoticeCategory category, String keyword, int page, int size);

    SupportDTO.NoticeDetail getNoticeDetail(Long noticeId);
}
