package kr.co.carrer.admin.cs.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "Admin Notice", description = "공지사항 관리 API")
public interface AdminNoticeControllerDocs {

    @Operation(summary = "공지사항 목록 조회")
    ResponseEntity<ApiResponse<PaginationResponse<NoticeDTO.ResponseList>>> getNotices(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Boolean visible,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    );

    @Operation(summary = "공지사항 상세 조회")
    ResponseEntity<ApiResponse<NoticeDTO.ResponseDetail>> getNoticeDetail(@PathVariable Long noticeId);

    @Operation(summary = "공지사항 등록")
    ResponseEntity<ApiResponse<NoticeDTO.ResponseResult>> createNotice(
        @RequestBody @Valid NoticeDTO.RequestCreate dto,
        @Parameter(hidden = true) AuthPrincipal principal
    );

    @Operation(summary = "공지사항 수정")
    ResponseEntity<ApiResponse<NoticeDTO.ResponseResult>> updateNotice(
        @PathVariable Long noticeId,
        @RequestBody @Valid NoticeDTO.RequestUpdate dto
    );

    @Operation(summary = "공지사항 삭제")
    ResponseEntity<ApiResponse<Void>> deleteNotice(@PathVariable Long noticeId);
}
