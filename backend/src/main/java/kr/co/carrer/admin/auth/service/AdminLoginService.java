package kr.co.carrer.admin.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.admin.auth.dto.AdminLoginDto;

public interface AdminLoginService {
    AdminLoginDto.Response login(AdminLoginDto.Request request, HttpServletResponse response);
    String refresh(String refreshToken, HttpServletResponse response);
    void logout(String refreshToken, String accessToken);
}
