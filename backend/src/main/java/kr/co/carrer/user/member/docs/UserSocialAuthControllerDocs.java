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
                            value = "{\"success\":true,\"statusCode\":200,\"message\":\"소셜 인증 URL이 생성되었습니다.\",\"data\":{\"provider\":\"kakao\",\"authorizationUrl\":\"https://kauth.kakao.com/oauth/authorize?...\",\"state\":\"opaque-state\"}}"))),
            @ApiResponse(responseCode = "400", description = "지원하지 않는 provider",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"지원하지 않는 소셜 로그인 provider입니다.\",\"code\":\"OAUTH_PROVIDER_INVALID\"}")))
    })
    ResponseEntity<?> authorize(
            @Parameter(description = "소셜 provider (kakao | naver | google)", example = "kakao")
            @PathVariable String provider);

    @Operation(summary = "소셜 OAuth 콜백 처리",
            description = "provider로부터 전달된 code와 state를 검증하고 기존 소셜 계정 여부에 따라 프론트엔드로 redirect한다. " +
                    "토큰은 URL이 아닌 단기 쿠키(MaxAge=60s, SameSite=Strict)로 전달하여 히스토리·로그·Referer 노출을 방지한다. " +
                    "기존 소셜 계정: cw_oauth_login_token 쿠키 + ?type=login 으로 /auth/oauth/callback redirect. " +
                    "최초 소셜 가입: cw_oauth_signup_token 쿠키 + ?type=signup&provider=...&email=... 으로 redirect. " +
                    "회원 식별 기준은 email이 아니라 provider + providerUserId 조합이다.")
    @ApiResponses({
            @ApiResponse(responseCode = "302", description = "로그인 성공 시 /auth/oauth/callback?type=login 으로 redirect (accessToken은 cw_oauth_login_token 쿠키)"),
            @ApiResponse(responseCode = "302", description = "신규 가입 필요 시 /auth/oauth/callback?type=signup&provider=...&email=... 으로 redirect (socialSignupToken은 cw_oauth_signup_token 쿠키)"),
            @ApiResponse(responseCode = "400", description = "지원하지 않는 provider / state 불일치 또는 만료",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"소셜 인증 요청이 유효하지 않습니다. 다시 시도해 주세요.\",\"code\":\"OAUTH_STATE_INVALID\"}"))),
            @ApiResponse(responseCode = "401", description = "provider code/token 검증 실패",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":401,\"message\":\"소셜 provider 인증에 실패했습니다.\",\"code\":\"OAUTH_PROVIDER_AUTH_FAILED\"}")))
    })
    void callback(
            @Parameter(description = "소셜 provider", example = "kakao") @PathVariable String provider,
            @Parameter(description = "provider에서 반환한 인증 코드") @RequestParam String code,
            @Parameter(description = "CSRF 방지용 state") @RequestParam String state,
            HttpServletResponse response) throws java.io.IOException;

    @Operation(summary = "소셜 회원가입 추가정보 완료",
            description = "OAuth provider 인증은 완료되었지만 아직 회원이 아닌 사용자의 추가정보를 저장하고 소셜 계정을 연결한다. " +
                    "socialSignupToken은 Redis에서 1회 소비 처리되며 TTL 10분이 적용된다. " +
                    "provider와 socialSignupToken의 provider 불일치 시 SOCIAL_SIGNUP_TOKEN_INVALID를 반환한다. " +
                    "가입 완료 후 프론트를 /auth/login?registered=social로 유도한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "소셜 회원가입 완료",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":200,\"message\":\"소셜 회원가입이 완료되었습니다.\",\"data\":{\"memberId\":\"uuid-v4\",\"roleType\":\"USER\",\"memberStatus\":\"ACTIVE\",\"nextPath\":\"/auth/login?registered=social\"}}"))),
            @ApiResponse(responseCode = "400", description = "socialSignupToken 만료/오류 또는 휴대폰 인증 token 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"소셜 가입 토큰이 유효하지 않습니다. 소셜 로그인을 다시 시도해 주세요.\",\"code\":\"SOCIAL_SIGNUP_TOKEN_INVALID\"}"))),
            @ApiResponse(responseCode = "409", description = "휴대폰 번호 중복 또는 이미 연결된 소셜 계정",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 사용 중인 휴대폰 번호입니다.\",\"code\":\"PHONE_ALREADY_EXISTS\"}")))
    })
    ResponseEntity<?> complete(@Valid @RequestBody UserSocialAuthDto.RequestSocialComplete request,
                               HttpServletResponse response);

    @Operation(summary = "소셜 가입 휴대폰 인증 후 분기(연동/신규)",
            description = "추가 정보 단계에서 휴대폰 인증(purpose=SOCIAL_SIGNUP) 성공 직후 호출한다. " +
                    "인증한 번호가 이미 가입된 회원(탈퇴 제외)이면 소셜 계정을 해당 회원에 연동하고 바로 로그인 처리하여 " +
                    "status=LINKED(accessToken 포함, refresh 쿠키 발급)를 반환한다. " +
                    "가입 이력이 없는 번호면 어떤 것도 저장하지 않고 status=NEW_MEMBER를 반환하며, " +
                    "프론트는 이름·약관을 입력받아 complete를 호출한다. " +
                    "연동은 반드시 휴대폰 OTP로 소유를 증명한 뒤에만 이루어진다(이메일 기반 자동 연동 금지).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "연동·로그인 완료(LINKED) 또는 신규 번호(NEW_MEMBER)",
                    content = @Content(examples = {
                            @ExampleObject(name = "LINKED",
                                    value = "{\"success\":true,\"statusCode\":200,\"message\":\"기존 계정에 소셜 로그인을 연동했습니다.\",\"data\":{\"status\":\"LINKED\",\"accessToken\":\"jwt...\",\"member\":{\"memberId\":\"uuid-v4\"},\"nextPath\":\"/\"}}"),
                            @ExampleObject(name = "NEW_MEMBER",
                                    value = "{\"success\":true,\"statusCode\":200,\"message\":\"추가 정보 입력이 필요합니다.\",\"data\":{\"status\":\"NEW_MEMBER\",\"accessToken\":null,\"member\":null,\"nextPath\":null}}")
                    })),
            @ApiResponse(responseCode = "400", description = "socialSignupToken 또는 휴대폰 인증 token 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"인증 토큰이 유효하지 않습니다. 인증을 다시 진행해 주세요.\",\"code\":\"VERIFICATION_TOKEN_INVALID\"}"))),
            @ApiResponse(responseCode = "409", description = "이미 연결된 소셜 계정",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 연결된 소셜 계정입니다.\",\"code\":\"SOCIAL_ACCOUNT_ALREADY_LINKED\"}")))
    })
    ResponseEntity<?> resolve(@Valid @RequestBody UserSocialAuthDto.RequestSocialResolve request,
                              HttpServletResponse response);
}
