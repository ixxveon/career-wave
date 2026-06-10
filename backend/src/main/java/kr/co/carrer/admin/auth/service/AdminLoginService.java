package kr.co.carrer.admin.auth.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.admin.auth.dto.AdminLoginDto;

public interface AdminLoginService {
    AdminLoginDto.Response login(AdminLoginDto.Request request, HttpServletResponse response);
}
