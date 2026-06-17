package kr.co.carrer.admin.cs.controller;

import jakarta.validation.Valid;
import kr.co.carrer.admin.cs.docs.AdminNoticeControllerDocs;
import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.service.AdminNoticeService;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/notices")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('CS'))")
public class AdminNoticeController implements AdminNoticeControllerDocs {

    private final AdminNoticeService adminNoticeService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<NoticeDTO.ResponseList>>> getNotices(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Boolean visible,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        NoticeCategory cat = parseEnum(NoticeCategory.class, category);
        return ResponseEntity.ok(ApiResponse.ok(
            adminNoticeService.getNotices(cat, visible, keyword, page, size)
        ));
    }

    @GetMapping("/{noticeId}")
    public ResponseEntity<ApiResponse<NoticeDTO.ResponseDetail>> getNoticeDetail(@PathVariable Long noticeId) {
        return ResponseEntity.ok(ApiResponse.ok(adminNoticeService.getNoticeDetail(noticeId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NoticeDTO.ResponseResult>> createNotice(
        @RequestBody @Valid NoticeDTO.RequestCreate dto,
        @AuthenticationPrincipal AuthPrincipal principal
    ) {
        Long adminId = parseAdminId(principal);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(adminNoticeService.createNotice(dto, adminId)));
    }

    @PutMapping("/{noticeId}")
    public ResponseEntity<ApiResponse<NoticeDTO.ResponseResult>> updateNotice(
        @PathVariable Long noticeId,
        @RequestBody @Valid NoticeDTO.RequestUpdate dto
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminNoticeService.updateNotice(noticeId, dto)));
    }

    @DeleteMapping("/{noticeId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotice(@PathVariable Long noticeId) {
        adminNoticeService.deleteNotice(noticeId);
        return ResponseEntity.ok(ApiResponse.ok("공지사항이 삭제되었습니다."));
    }

    private Long parseAdminId(AuthPrincipal principal) {
        if (principal == null) throw new CustomException(kr.co.carrer.global.exception.ErrorCode.UNAUTHORIZED);
        try {
            return Long.parseLong(principal.getId());
        } catch (NumberFormatException e) {
            throw new CustomException(kr.co.carrer.global.exception.ErrorCode.UNAUTHORIZED);
        }
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumClass, String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new CustomException(kr.co.carrer.global.exception.ErrorCode.BAD_REQUEST);
        }
    }
}
