package kr.co.carrer.user.member.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserVerificationControllerDocs;
import kr.co.carrer.user.member.dto.UserVerificationDto;
import kr.co.carrer.user.member.service.UserVerificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User Verification", description = "이메일/휴대폰 인증번호 발송 및 확인 API")
@RestController
@RequestMapping("/api/v1/user/members/verifications")
@RequiredArgsConstructor
public class UserVerificationController implements UserVerificationControllerDocs {

    private final UserVerificationService userVerificationService;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<UserVerificationDto.ResponseSendVerification>> send(
            @Valid @RequestBody UserVerificationDto.RequestSendVerification request) {
        return ResponseEntity.ok(
                ApiResponse.ok("인증번호가 발송되었습니다.", userVerificationService.send(request)));
    }

    @PostMapping("/confirm")
    public ResponseEntity<ApiResponse<UserVerificationDto.ResponseConfirmVerification>> confirm(
            @Valid @RequestBody UserVerificationDto.RequestConfirmVerification request) {
        return ResponseEntity.ok(
                ApiResponse.ok("인증이 완료되었습니다.", userVerificationService.confirm(request)));
    }
}
