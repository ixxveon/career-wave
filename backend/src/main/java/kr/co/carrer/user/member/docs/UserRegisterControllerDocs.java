package kr.co.carrer.user.member.docs;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "User Register", description = "사용자 회원가입 / 아이디 중복 확인 / 재직증명서 업로드 API")
public interface UserRegisterControllerDocs {

    @Operation(summary = "로그인 아이디 중복 확인",
            description = "회원가입 전 loginId 사용 가능 여부를 조회한다. " +
                    "형식 오류(영문/숫자 6~20자)는 400을 반환하고, 중복 여부는 200 응답의 available 필드로 구분한다. " +
                    "최종 가입 시점에 중복 여부를 다시 검증한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공 (available=true: 사용 가능, available=false: 중복)",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":200,\"message\":\"사용 가능한 아이디입니다.\",\"data\":{\"available\":true}}"))),
            @ApiResponse(responseCode = "400", description = "아이디 형식 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"아이디 형식이 올바르지 않습니다. 영문/숫자 6~20자로 입력해 주세요.\",\"code\":\"LOGIN_ID_INVALID\"}")))
    })
    ResponseEntity<?> checkLoginId(
            @Parameter(description = "확인할 로그인 아이디 (영문/숫자 6~20자)", example = "career_user01")
            @RequestParam String loginId);

    @Operation(summary = "개인회원 가입",
            description = "개인회원을 가입한다. " +
                    "이메일/휴대폰 인증 token 검증, 비밀번호 정책 검증, 중복 검증 후 가입 처리한다. " +
                    "가입 성공 시 personal_profiles 빈 row를 함께 생성한다. " +
                    "company_verification_agreed, sms_agreed는 null로 저장한다.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "가입 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":201,\"message\":\"회원가입이 완료되었습니다.\",\"data\":{\"memberId\":\"uuid-v4\",\"roleType\":\"USER\",\"memberStatus\":\"ACTIVE\"}}"))),
            @ApiResponse(responseCode = "400", description = "인증 token 오류 / 비밀번호 정책 위반 / 필수 약관 미동의",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"인증 토큰이 유효하지 않습니다. 인증을 다시 진행해 주세요.\",\"code\":\"VERIFICATION_TOKEN_INVALID\"}"))),
            @ApiResponse(responseCode = "409", description = "아이디 / 이메일 / 휴대폰 중복",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 사용 중인 아이디입니다.\",\"code\":\"LOGIN_ID_ALREADY_EXISTS\"}")))
    })
    ResponseEntity<?> registerUser(@Valid @RequestBody UserRegisterDto.RequestPersonalRegister request);

    @Operation(summary = "기업회원 가입",
            description = "기업 담당자 정보, 재직증명서 fileId, 담당자 인증 token, 필수 약관 동의로 가입 신청을 접수한다. " +
                    "국세청 사업자등록정보 상태조회 API를 통해 businessNumber를 검증한다. " +
                    "가입 신청 접수 후 hr_managers.hr_status=PENDING_REVIEW로 생성되며 access/refresh token을 발급하지 않는다. " +
                    "admin 승인 후 APPROVED 상태가 되어야 로그인할 수 있다.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "가입 신청 접수 성공",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":201,\"message\":\"기업회원 가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다.\",\"data\":{\"memberId\":\"uuid-v4\",\"companyProfileId\":\"uuid-v4\",\"roleType\":\"COMPANY\",\"memberStatus\":\"ACTIVE\",\"companyApprovalStatus\":\"PENDING_REVIEW\"}}"))),
            @ApiResponse(responseCode = "400", description = "인증 token 오류 / 사업자 검증 실패 / 재직증명서 fileId 오류",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"사업자등록정보 확인에 실패했습니다. 사업자등록번호를 다시 확인해 주세요.\",\"code\":\"COMPANY_BUSINESS_VERIFICATION_FAILED\"}"))),
            @ApiResponse(responseCode = "409", description = "아이디 / 이메일 / 사업자등록번호 중복",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":409,\"message\":\"이미 등록된 사업자등록번호입니다.\",\"code\":\"BUSINESS_NUMBER_ALREADY_EXISTS\"}"))),
            @ApiResponse(responseCode = "503", description = "사업자 검증 외부 API 장애",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":503,\"message\":\"사업자 검증 서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.\",\"code\":\"COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE\"}")))
    })
    ResponseEntity<?> registerCompany(@Valid @RequestBody UserRegisterDto.RequestCompanyRegister request);

    @Operation(summary = "재직증명서 PDF 업로드",
            description = "기업회원 가입 전 재직증명서 PDF를 S3에 업로드하고 임시 fileId를 반환한다. " +
                    "파일 형식은 PDF만 허용하며 최대 5MB까지 업로드할 수 있다. " +
                    "반환된 fileId는 기업회원 가입 API의 employmentCertificateFileId 필드에 사용한다. " +
                    "사용되지 않은 fileId 정리는 별도 배치 작업으로 처리 예정입니다.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "업로드 성공",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = UserRegisterDto.ResponseEmploymentCertificateUpload.class),
                            examples = @ExampleObject(
                                    value = "{\"success\":true,\"statusCode\":200,\"message\":\"파일이 업로드되었습니다.\",\"data\":{\"fileId\":\"employment-certificates/2026-06-18/uuid.pdf\",\"originalName\":\"certificate.pdf\",\"mimeType\":\"application/pdf\",\"size\":1200000,\"uploadedAt\":\"2026-06-18T12:30:00Z\"}}"))),
            @ApiResponse(responseCode = "400", description = "PDF 형식 아님 또는 MIME 불일치",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"재직증명서는 PDF 파일만 업로드할 수 있습니다.\",\"code\":\"EMPLOYMENT_FILE_INVALID\"}"))),
            @ApiResponse(responseCode = "413", description = "5MB 초과",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":413,\"message\":\"파일 크기는 5MB를 초과할 수 없습니다.\",\"code\":\"EMPLOYMENT_FILE_TOO_LARGE\"}"))),
            @ApiResponse(responseCode = "415", description = "지원하지 않는 파일 형식",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":415,\"message\":\"지원하지 않는 파일 형식입니다.\",\"code\":\"EMPLOYMENT_FILE_UNSUPPORTED\"}")))
    })
    ResponseEntity<?> uploadEmploymentCertificate(
            @Parameter(description = "업로드할 재직증명서 PDF 파일 (최대 5MB)")
            @RequestParam("file") MultipartFile file);

    @Operation(summary = "사업자 번호 사전 확인",
            description = "기업 등록 전 사업자등록번호의 국세청 등록 상태를 빠르게 확인한다. " +
                    "정상(CONTINUING) 여부를 반환하며, 최종 기업 등록 시에는 서버에서 재검증된다. " +
                    "businessStatus: CONTINUING(정상), SUSPENDED(휴업), CLOSED(폐업), NOT_REGISTERED(미등록/조회불가)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "조회 성공 (valid=true: 정상 사업자, valid=false: 휴업/폐업/미등록)",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":true,\"statusCode\":200,\"message\":\"정상 영업 중인 사업자입니다.\",\"data\":{\"valid\":true,\"businessStatus\":\"CONTINUING\"}}"))),
            @ApiResponse(responseCode = "400", description = "사업자번호 형식 오류 (10자리 숫자 아님)",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":400,\"message\":\"입력값 검증에 실패했습니다.\",\"code\":null}"))),
            @ApiResponse(responseCode = "503", description = "국세청 API 장애/타임아웃",
                    content = @Content(examples = @ExampleObject(
                            value = "{\"success\":false,\"statusCode\":503,\"message\":\"사업자 검증 서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.\",\"code\":\"COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE\"}")))
    })
    ResponseEntity<?> checkBusinessNumber(@Valid @RequestBody UserRegisterDto.RequestCheckBusinessNumber request);
}
