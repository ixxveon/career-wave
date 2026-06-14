package kr.co.carrer.admin.cs.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.carrer.admin.cs.dto.CsDTO;
import kr.co.carrer.global.response.ApiResponse;
import org.springframework.http.ResponseEntity;

@Tag(name = "Admin CS", description = "고객센터 관리 API")
public interface AdminCsControllerDocs {

    @Operation(summary = "고객센터 KPI 집계 조회")
    ResponseEntity<ApiResponse<CsDTO.ResponseSummary>> getSummary();
}
