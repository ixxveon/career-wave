package kr.co.carrer.user.support.controller;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.support.docs.UserFaqControllerDocs;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.service.UserFaqService;
import kr.co.carrer.user.support.type.FaqCategory;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/v1/user/faqs")
@RequiredArgsConstructor
public class UserFaqController implements UserFaqControllerDocs {

    private final UserFaqService userFaqService;

    @GetMapping
    public ResponseEntity<ApiResponse<PaginationResponse<SupportDTO.FaqItem>>> getFaqs(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        FaqCategory cat = parseEnum(FaqCategory.class, category);
        return ResponseEntity.ok(ApiResponse.ok(userFaqService.getFaqs(cat, keyword, page, size)));
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
