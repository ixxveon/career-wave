package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserRegisterDto;
import org.springframework.web.multipart.MultipartFile;

public interface UserRegisterService {

    UserRegisterDto.ResponseCheckLoginId checkLoginId(String loginId);

    UserRegisterDto.ResponsePersonalRegister registerUser(UserRegisterDto.RequestPersonalRegister request);

    UserRegisterDto.ResponseCompanyRegister registerCompany(UserRegisterDto.RequestCompanyRegister request);

    UserRegisterDto.ResponseEmploymentCertificateUpload uploadEmploymentCertificate(MultipartFile file);

    /** 기업 등록 전 사업자번호 사전 확인 — 프론트 빠른 피드백용 (최종 등록 시 재검증됨) */
    UserRegisterDto.ResponseCheckBusinessNumber checkBusinessNumber(String businessNumber);
}
