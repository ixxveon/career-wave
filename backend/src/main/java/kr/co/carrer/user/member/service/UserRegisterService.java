package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserRegisterDto;
import org.springframework.web.multipart.MultipartFile;

public interface UserRegisterService {

    UserRegisterDto.ResponseCheckLoginId checkLoginId(String loginId);

    UserRegisterDto.ResponsePersonalRegister registerUser(UserRegisterDto.RequestPersonalRegister request);

    UserRegisterDto.ResponseCompanyRegister registerCompany(UserRegisterDto.RequestCompanyRegister request);

    UserRegisterDto.ResponseEmploymentCertificateUpload uploadEmploymentCertificate(MultipartFile file);
}
