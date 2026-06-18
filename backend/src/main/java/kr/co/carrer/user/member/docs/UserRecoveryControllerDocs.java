package kr.co.carrer.user.member.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.user.member.dto.UserRecoveryDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "User Recovery", description = "아이디 찾기 / 비밀번호 재설정 API")
public interface UserRecoveryControllerDocs {

    @Operation(summary = "아이디 찾기",
            description = "인증 token으로 아이디를 조회한다. " +
                    "개인회원(roleType=USER)은 verificationToken만 필요하고, " +
                    "기업회원(roleType=COMPANY)은 managerName과 businessNumber를 추가로 검증한다. " +
                    "결과가 없어도 동일한 일반 메시지를 반환한다(계정 존재 여부 노출 금지). " +
                    "loginId는 앞 3자 + * 마스킹하여 반환한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공 (found=false이면 계정 없음)",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"message\":\"요청이 처리되었습니다.\",\"data\":{\"maskedLoginIds\":[\"caree***01\"],\"found\":true}}"))),
            @ApiResponse(responseCode = "400", description = "verificationToken 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"인증 토큰이 유효하지 않습니다. 인증을 다시 진행해 주세요.\",\"code\":\"VERIFICATION_TOKEN_INVALID\"}")))
    })
    ResponseEntity<?> findId(@Valid @RequestBody UserRecoveryDto.RequestFindId request);

    @Operation(summary = "비밀번호 재설정 권한 발급",
            description = "인증 token 검증 후 비밀번호 재설정용 resetToken을 발급한다. " +
                    "개인회원(roleType=USER)은 loginId + verificationToken, " +
                    "기업회원(roleType=COMPANY)은 loginId + managerName + businessNumber + verificationToken을 검증한다. " +
                    "loginId + IP 기준 10분 5회 rate limit이 적용된다. " +
                    "발급된 resetToken은 SHA-256 hash로 저장되며 1회 사용 후 폐기된다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "resetToken 발급 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"message\":\"비밀번호를 재설정할 수 있습니다.\",\"data\":{\"resetToken\":\"reset-token\",\"expiresAt\":\"2026-06-18T12:40:00Z\"}}"))),
            @ApiResponse(responseCode = "400", description = "verificationToken 오류 또는 계정 조회 실패",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"인증 토큰이 유효하지 않습니다. 인증을 다시 진행해 주세요.\",\"code\":\"VERIFICATION_TOKEN_INVALID\"}")))
    })
    ResponseEntity<?> issuePasswordToken(@Valid @RequestBody UserRecoveryDto.RequestPasswordToken request,
                                         jakarta.servlet.http.HttpServletRequest httpRequest);

    @Operation(summary = "비밀번호 재설정",
            description = "resetToken으로 비밀번호를 변경한다. " +
                    "비밀번호 변경 성공 시 해당 회원의 모든 refresh token을 폐기하여 모든 기기에서 재로그인을 유도한다. " +
                    "resetToken은 만료되었거나 이미 사용된 경우 거부된다. " +
                    "새 비밀번호는 8~64자, 영문/숫자/특수문자 포함, loginId 포함 금지 정책을 따른다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "비밀번호 변경 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"message\":\"비밀번호가 변경되었습니다.\",\"data\":{\"changedAt\":\"2026-06-18T12:39:00Z\"}}"))),
            @ApiResponse(responseCode = "400", description = "resetToken 없음/위조/재사용 또는 만료 또는 비밀번호 정책 위반",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"비밀번호 재설정 권한이 유효하지 않습니다.\",\"code\":\"PASSWORD_RESET_TOKEN_INVALID\"}")))
    })
    ResponseEntity<?> resetPassword(@Valid @RequestBody UserRecoveryDto.RequestResetPassword request);
}
