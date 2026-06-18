package kr.co.carrer.user.member.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kr.co.carrer.user.member.dto.UserSocialAuthDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@Tag(name = "User Social Auth", description = "소셜 OAuth 로그인 / 회원가입 API (Kakao · Naver · Google)")
public interface UserSocialAuthControllerDocs {

    @Operation(summary = "소셜 OAuth 인증 URL 생성",
            description = "provider(kakao|naver|google)에 대한 OAuth 인증 URL을 생성하고 state를 Redis에 저장한다. " +
                    "SPA 프론트가 반환된 authorizationUrl로 직접 이동한다. " +
                    "Apple 로그인은 지원하지 않는다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "인증 URL 생성 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"message\":\"소셜 인증 URL이 생성되었습니다.\",\"data\":{\"provider\":\"kakao\",\"authorizationUrl\":\"https://kauth.kakao.com/oauth/authorize?...\",\"state\":\"opaque-state\"}}"))),
            @ApiResponse(responseCode = "400", description = "지원하지 않는 provider",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"지원하지 않는 소셜 로그인 provider입니다.\",\"code\":\"OAUTH_PROVIDER_INVALID\"}")))
    })
    ResponseEntity<?> authorize(
            @Parameter(description = "소셜 provider (kakao | naver | google)", example = "kakao")
            @PathVariable String provider);

    @Operation(summary = "소셜 OAuth 콜백 처리",
            description = "provider로부터 전달된 code와 state를 검증하고 기존 소셜 계정 여부에 따라 응답을 분기한다. " +
                    "기존 소셜 계정: accessToken + 회원 정보 반환 (refresh token은 HttpOnly Cookie). " +
                    "최초 소셜 가입: socialSignupToken 반환 후 프론트를 /register/social/complete로 유도. " +
                    "회원 식별 기준은 email이 아니라 provider + providerUserId 조합이다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "기존 소셜 계정 로그인 성공 또는 추가정보 입력 필요",
                    content = @Content(examples = @ExampleObject(
                            name = "기존 계정 로그인",
                            value = "{\"success\":true,\"message\":\"로그인되었습니다.\",\"data\":{\"accessToken\":\"jwt-access-token\",\"member\":{\"memberId\":\"uuid-v4\",\"loginId\":\"social_user01\",\"name\":\"홍길동\",\"roleType\":\"USER\",\"memberStatus\":\"ACTIVE\",\"subscriptionStatus\":\"FREE\",\"companyApprovalStatus\":\"NONE\",\"lastLoginAt\":\"2026-06-18T10:00:00Z\"},\"nextPath\":\"/user/dashboard\"}}"))),
            @ApiResponse(responseCode = "400", description = "지원하지 않는 provider / state 불일치 또는 만료",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"소셜 인증 요청이 유효하지 않습니다. 다시 시도해 주세요.\",\"code\":\"OAUTH_STATE_INVALID\"}"))),
            @ApiResponse(responseCode = "401", description = "provider code/token 검증 실패",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":401,\"message\":\"소셜 provider 인증에 실패했습니다.\",\"code\":\"OAUTH_PROVIDER_AUTH_FAILED\"}")))
    })
    ResponseEntity<?> callback(
            @Parameter(description = "소셜 provider", example = "kakao") @PathVariable String provider,
            @Parameter(description = "provider에서 반환한 인증 코드") @RequestParam String code,
            @Parameter(description = "CSRF 방지용 state") @RequestParam String state,
            HttpServletResponse response);

    @Operation(summary = "소셜 회원가입 추가정보 완료",
            description = "OAuth provider 인증은 완료되었지만 아직 회원이 아닌 사용자의 추가정보를 저장하고 소셜 계정을 연결한다. " +
                    "socialSignupToken은 Redis에서 1회 소비 처리되며 TTL 10분이 적용된다. " +
                    "provider와 socialSignupToken의 provider 불일치 시 SOCIAL_SIGNUP_TOKEN_INVALID를 반환한다. " +
                    "가입 완료 후 프론트를 /auth/login?registered=social로 유도한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "소셜 회원가입 완료",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"message\":\"소셜 회원가입이 완료되었습니다.\",\"data\":{\"memberId\":\"uuid-v4\",\"roleType\":\"USER\",\"memberStatus\":\"ACTIVE\",\"nextPath\":\"/auth/login?registered=social\"}}"))),
            @ApiResponse(responseCode = "400", description = "socialSignupToken 만료/오류 또는 휴대폰 인증 token 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"소셜 가입 토큰이 유효하지 않습니다. 소셜 로그인을 다시 시도해 주세요.\",\"code\":\"SOCIAL_SIGNUP_TOKEN_INVALID\"}"))),
            @ApiResponse(responseCode = "409", description = "휴대폰 번호 중복 또는 이미 연결된 소셜 계정",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 사용 중인 휴대폰 번호입니다.\",\"code\":\"PHONE_ALREADY_EXISTS\"}")))
    })
    ResponseEntity<?> complete(@Valid @RequestBody UserSocialAuthDto.RequestSocialComplete request,
                               HttpServletResponse response);
}
