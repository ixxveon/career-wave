package kr.co.carrer.user.support.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.support.dto.SupportDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Tag(name = "User FAQ", description = "사용자 FAQ 조회 API")
public interface UserFaqControllerDocs {

    @Operation(summary = "FAQ 목록 조회", description = "전체 목록 반환. keyword는 question·answer ILIKE 검색.")
    ResponseEntity<ApiResponse<List<SupportDTO.FaqItem>>> getFaqs(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String keyword
    );
}
