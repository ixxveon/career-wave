package kr.co.carrer.admin.auth.docs;

import kr.co.carrer.admin.auth.dto.AdminLoginDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Admin Auth", description = "관리자 로그인 / 토큰 재발급 API")
public interface AdminAuthControllerDocs {

    @Operation(summary = "관리자 로그인",
            description = "loginId + password로 로그인. " +
                    "성공 시 accessToken + adminInfo(id, name, role) 반환, refreshToken은 HttpOnly Set-Cookie로 발급. " +
                    "JWT에 adminRole(MASTER|CS|BACKEND) claim 포함.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "로그인 성공"),
            @ApiResponse(responseCode = "401", description = "아이디/비밀번호 불일치",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":401,\"message\":\"아이디 또는 비밀번호가 올바르지 않습니다.\",\"code\":\"AUTH_INVALID_CREDENTIALS\"}"))),
            @ApiResponse(responseCode = "423", description = "로그인 시도 횟수 초과 잠금",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":423,\"message\":\"계정이 잠겼습니다.\",\"code\":\"AUTH_ACCOUNT_LOCKED\"}")))
    })
    ResponseEntity<?> login(@Valid @RequestBody AdminLoginDto.Request request, HttpServletRequest httpRequest, HttpServletResponse response);

    @Operation(summary = "관리자 토큰 재발급",
            description = "HttpOnly Cookie의 refreshToken으로 새 accessToken + adminInfo(id, name, role) 발급. " +
                    "새 refreshToken도 Set-Cookie로 재발급(rotation). " +
                    "adminInfo는 프론트가 sessionStorage 부재(탭 재오픈 등) 상황에서 세션을 완전 복원하는 데 사용한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "토큰 재발급 성공"),
            @ApiResponse(responseCode = "401", description = "refreshToken 없음/만료/위조",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":401,\"message\":\"유효하지 않은 리프레시 토큰입니다.\",\"code\":\"AUTH_REFRESH_INVALID\"}")))
    })
    ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response);

    @Operation(summary = "관리자 로그아웃",
            description = "refresh Redis key 삭제 + access token jti blacklist 등록 + refreshToken cookie 만료(Max-Age=0).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "로그아웃 성공"),
            @ApiResponse(responseCode = "401", description = "유효한 access token 없음")
    })
    ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response);
}
