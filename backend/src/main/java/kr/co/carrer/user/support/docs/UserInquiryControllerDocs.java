package kr.co.carrer.user.support.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Tag(name = "User Inquiry", description = "사용자 1:1 문의 API")
public interface UserInquiryControllerDocs {

    @Operation(summary = "내 문의 목록 조회", description = "로그인 회원 본인 문의만 반환. created_at DESC.")
    ResponseEntity<ApiResponse<List<SupportDTO.InquiryList>>> getMyInquiries(
        @RequestParam(required = false) String category,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );

    @Operation(summary = "문의 접수", description = "inquiry_status=PENDING으로 생성. JWT 인증 필수.")
    ResponseEntity<ApiResponse<SupportDTO.ResponseCreateInquiry>> createInquiry(
        @RequestBody @Valid SupportDTO.RequestCreateInquiry dto,
        @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal
    );
}
