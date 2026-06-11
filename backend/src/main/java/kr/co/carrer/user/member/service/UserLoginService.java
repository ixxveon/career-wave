package kr.co.carrer.user.member.service;

import jakarta.servlet.http.HttpServletResponse;
import kr.co.carrer.user.member.dto.UserLoginDto;

public interface UserLoginService {
    UserLoginDto.Response login(UserLoginDto.Request request, HttpServletResponse response);
}
