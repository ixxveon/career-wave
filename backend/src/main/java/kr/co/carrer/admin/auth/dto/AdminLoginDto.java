package kr.co.carrer.admin.auth.dto;

import jakarta.validation.constraints.NotBlank;
import kr.co.carrer.admin.auth.type.AdminRole;
import lombok.Getter;

public class AdminLoginDto {

    @Getter
    public static class Request {
        @NotBlank private final String loginId;
        @NotBlank private final String password;

        public Request(String loginId, String password) {
            this.loginId = loginId;
            this.password = password;
        }
    }

    @Getter
    public static class Response {
        private final String accessToken;
        private final AdminInfo adminInfo;

        public Response(String accessToken, AdminInfo adminInfo) {
            this.accessToken = accessToken;
            this.adminInfo = adminInfo;
        }
    }

    @Getter
    public static class AdminInfo {
        private final Long id;
        private final String name;
        private final String role;

        public AdminInfo(Long id, String name, String role) {
            this.id = id;
            this.name = name;
            this.role = role;
        }
    }
}
