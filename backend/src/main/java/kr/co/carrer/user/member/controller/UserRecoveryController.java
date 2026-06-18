package kr.co.carrer.user.member.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserRecoveryControllerDocs;
import kr.co.carrer.user.member.dto.UserRecoveryDto;
import kr.co.carrer.user.member.service.UserRecoveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User Recovery", description = "아이디 찾기 / 비밀번호 재설정 API")
@RestController
@RequestMapping("/api/v1/user/members/recovery")
@RequiredArgsConstructor
public class UserRecoveryController implements UserRecoveryControllerDocs {

    private final UserRecoveryService userRecoveryService;

    @PostMapping("/find-id")
    public ResponseEntity<ApiResponse<UserRecoveryDto.ResponseFindId>> findId(
            @Valid @RequestBody UserRecoveryDto.RequestFindId request) {
        return ResponseEntity.ok(
                ApiResponse.ok("요청이 처리되었습니다.", userRecoveryService.findId(request)));
    }

    @PostMapping("/password-token")
    public ResponseEntity<ApiResponse<UserRecoveryDto.ResponsePasswordToken>> issuePasswordToken(
            @Valid @RequestBody UserRecoveryDto.RequestPasswordToken request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        return ResponseEntity.ok(
                ApiResponse.ok("비밀번호를 재설정할 수 있습니다.",
                        userRecoveryService.issuePasswordToken(request, clientIp)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<UserRecoveryDto.ResponseResetPassword>> resetPassword(
            @Valid @RequestBody UserRecoveryDto.RequestResetPassword request) {
        return ResponseEntity.ok(
                ApiResponse.ok("비밀번호가 변경되었습니다.", userRecoveryService.resetPassword(request)));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String ip = forwarded.split(",")[0].trim();
            if (!ip.isBlank()) return ip;
        }
        return request.getRemoteAddr();
    }
}
