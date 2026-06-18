package kr.co.carrer.user.member.controller;

import jakarta.validation.Valid;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.member.docs.UserRegisterControllerDocs;
import kr.co.carrer.user.member.dto.UserRegisterDto;
import kr.co.carrer.user.member.service.UserRegisterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/user/members")
@RequiredArgsConstructor
@Validated
public class UserRegisterController implements UserRegisterControllerDocs {

    private final UserRegisterService userRegisterService;

    @GetMapping("/login-id/check")
    public ResponseEntity<ApiResponse<UserRegisterDto.ResponseCheckLoginId>> checkLoginId(
            @RequestParam String loginId) {
        UserRegisterDto.ResponseCheckLoginId result = userRegisterService.checkLoginId(loginId);
        String message = result.available() ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다.";
        return ResponseEntity.ok(ApiResponse.ok(message, result));
    }

    @PostMapping("/register/user")
    public ResponseEntity<ApiResponse<UserRegisterDto.ResponsePersonalRegister>> registerUser(
            @Valid @RequestBody UserRegisterDto.RequestPersonalRegister request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("회원가입이 완료되었습니다.", userRegisterService.registerUser(request)));
    }

    @PostMapping("/register/company")
    public ResponseEntity<ApiResponse<UserRegisterDto.ResponseCompanyRegister>> registerCompany(
            @Valid @RequestBody UserRegisterDto.RequestCompanyRegister request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(
                        "기업회원 가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다.",
                        userRegisterService.registerCompany(request)));
    }

    @PostMapping(value = "/company/employment-certificate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserRegisterDto.ResponseEmploymentCertificateUpload>> uploadEmploymentCertificate(
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(
                ApiResponse.ok("파일이 업로드되었습니다.", userRegisterService.uploadEmploymentCertificate(file)));
    }
}
