package kr.co.carrer.user.support.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "User Notice", description = "사용자 공지사항 조회 API")
public interface UserNoticeControllerDocs {

    @Operation(summary = "공지사항 목록 조회", description = "is_visible=true 공지만 반환. is_pinned=true 건 상단 고정.")
    ResponseEntity<ApiResponse<PaginationResponse<SupportDTO.NoticeList>>> getNotices(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "공지사항 상세 조회", description = "조회 시 view_count +1. is_visible=false 건은 404 반환.")
    ResponseEntity<ApiResponse<SupportDTO.NoticeDetail>> getNoticeDetail(@PathVariable Long noticeId);
}
