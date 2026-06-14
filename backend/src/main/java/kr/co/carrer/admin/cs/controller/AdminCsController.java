package kr.co.carrer.admin.cs.controller;

import kr.co.carrer.admin.cs.docs.AdminCsControllerDocs;
import kr.co.carrer.admin.cs.dto.CsDTO;
import kr.co.carrer.admin.cs.service.AdminCsService;
import kr.co.carrer.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/cs")
@RequiredArgsConstructor
// TODO: JWT 필터 구현 후 이슈 #310에서 활성화 예정
// @PreAuthorize("hasRole('ADMIN')")
public class AdminCsController implements AdminCsControllerDocs {

    private final AdminCsService adminCsService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<CsDTO.ResponseSummary>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(adminCsService.getSummary()));
    }
}
