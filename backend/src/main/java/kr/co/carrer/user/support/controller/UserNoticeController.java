package kr.co.carrer.user.support.controller;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.docs.UserNoticeControllerDocs;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.service.UserNoticeService;
import kr.co.carrer.user.support.type.NoticeCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user/notices")
@RequiredArgsConstructor
public class UserNoticeController implements UserNoticeControllerDocs {

    private final UserNoticeService userNoticeService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<SupportDTO.NoticeList>>> getNotices(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        NoticeCategory cat = parseEnum(NoticeCategory.class, category);
        return ResponseEntity.ok(ApiResponse.ok(
            userNoticeService.getNotices(cat, keyword, page, size)
        ));
    }

    @GetMapping("/{noticeId}")
    public ResponseEntity<ApiResponse<SupportDTO.NoticeDetail>> getNoticeDetail(@PathVariable Long noticeId) {
        return ResponseEntity.ok(ApiResponse.ok(userNoticeService.getNoticeDetail(noticeId)));
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(ErrorCode.BAD_REQUEST);
        }
    }
}
