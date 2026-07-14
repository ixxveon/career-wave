package kr.co.carrer.user.jobnotice.controller;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.jobnotice.docs.UserJobNoticeControllerDocs;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.service.UserJobNoticeService;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user/job-notices")
public class UserJobNoticeController implements UserJobNoticeControllerDocs {

    private final UserJobNoticeService userJobNoticeService;

    @Override
    @GetMapping
    public ResponseEntity<ApiResponse<JobNoticeDTO.ResponseList>> getJobNotices(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<JobType> jobType,
            @RequestParam(required = false) List<String> jobCategory,
            @RequestParam(required = false) List<CareerLevel> careerLevel,
            @RequestParam(required = false) List<String> location,
            @RequestParam(required = false) List<CompanySize> companySize,
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = principal != null ? UUID.fromString(principal.getId()) : null;

        return ResponseEntity.ok(
                ApiResponse.ok(
                        "채용 공고 목록 조회에 성공했습니다.",
                        userJobNoticeService.getJobNotices(
                                keyword,
                                jobType,
                                jobCategory,
                                careerLevel,
                                location,
                                companySize,
                                period,
                                sort,
                                page,
                                size,
                                memberId
                        )
                )
        );
    }

    @Override
    @GetMapping("/{jobNoticeId}")
    public ResponseEntity<ApiResponse<JobNoticeDTO.ResponseDetail>> getJobNoticeDetail(
            @PathVariable Long jobNoticeId,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = principal != null ? UUID.fromString(principal.getId()) : null;

        return ResponseEntity.ok(
                ApiResponse.ok(
                        "채용 공고 상세 조회에 성공했습니다.",
                        userJobNoticeService.getJobNoticeDetail(jobNoticeId, memberId)
                )
        );
    }

    @Override
    @PostMapping("/{jobNoticeId}/bookmarks")
    public ResponseEntity<ApiResponse<JobNoticeDTO.ResponseBookmark>> createBookmark(
            @PathVariable Long jobNoticeId,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.ok(
                        "북마크를 등록했습니다.",
                        userJobNoticeService.createBookmark(jobNoticeId, memberId)
                )
        );
    }

    @Override
    @DeleteMapping("/{jobNoticeId}/bookmarks")
    public ResponseEntity<ApiResponse<JobNoticeDTO.ResponseBookmark>> deleteBookmark(
            @PathVariable Long jobNoticeId,
            @AuthenticationPrincipal AuthPrincipal principal
    ) {
        UUID memberId = UUID.fromString(principal.getId());

        return ResponseEntity.ok(
                ApiResponse.ok(
                        "북마크를 해제했습니다.",
                        userJobNoticeService.deleteBookmark(jobNoticeId, memberId)
                )
        );
    }
}
