package kr.co.carrer.user.member.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.user.member.dto.UserVerificationDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "User Verification", description = "이메일/휴대폰 인증번호 발송 및 확인 API")
public interface UserVerificationControllerDocs {

    @Operation(summary = "인증번호 발송",
            description = "이메일 또는 휴대폰으로 6자리 인증번호를 발송한다. " +
                    "channel=EMAIL이면 AWS SES, channel=PHONE이면 SOLAPI/CoolSMS를 통해 발송한다. " +
                    "인증번호는 5분 유효하며 동일 target+purpose 기준 60초 이내 재발송은 불가하다. " +
                    "인증번호 원문은 저장하지 않고 SHA-256 codeHash만 저장한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "발송 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":200,\"message\":\"인증번호가 발송되었습니다.\",\"data\":{\"verificationId\":\"uuid-v4\",\"expiresAt\":\"2026-06-18T12:35:00Z\",\"resendAvailableAt\":\"2026-06-18T12:31:00Z\",\"remainingAttempts\":5}}"))),
            @ApiResponse(responseCode = "400", description = "이메일/휴대폰 형식 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"인증 대상 형식이 올바르지 않습니다.\",\"code\":\"VERIFICATION_TARGET_INVALID\"}"))),
            @ApiResponse(responseCode = "429", description = "재발송 60초 제한 또는 시도 횟수 초과",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":429,\"message\":\"인증 요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.\",\"code\":\"VERIFICATION_RATE_LIMITED\"}")))
    })
    ResponseEntity<?> send(@Valid @RequestBody UserVerificationDto.RequestSendVerification request);

    @Operation(summary = "인증번호 확인",
            description = "발송된 6자리 인증번호를 확인한다. " +
                    "인증 성공 시 verificationToken을 반환하며, 이 token은 회원가입/아이디 찾기/비밀번호 재설정 요청 시 서버 검증에 사용된다. " +
                    "프론트의 인증 완료 boolean은 신뢰하지 않는다. " +
                    "최대 5회 실패 시 verificationId가 차단된다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "인증 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":200,\"message\":\"인증이 완료되었습니다.\",\"data\":{\"verificationToken\":\"short-lived-token\",\"verifiedAt\":\"2026-06-18T12:32:00Z\"}}"))),
            @ApiResponse(responseCode = "400", description = "인증번호 불일치 / 만료 / 인증 token 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"인증번호가 일치하지 않습니다.\",\"code\":\"INVALID_VERIFICATION_CODE\"}"))),
            @ApiResponse(responseCode = "429", description = "인증번호 5회 실패 차단",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":429,\"message\":\"인증 요청 횟수를 초과했습니다. 잠시 후 다시 시도해 주세요.\",\"code\":\"VERIFICATION_RATE_LIMITED\"}")))
    })
    ResponseEntity<?> confirm(@Valid @RequestBody UserVerificationDto.RequestConfirmVerification request);
}
