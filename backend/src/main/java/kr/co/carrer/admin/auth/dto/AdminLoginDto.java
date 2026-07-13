package kr.co.carrer.admin.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import kr.co.carrer.admin.auth.type.AdminRole;
import lombok.Getter;

public class AdminLoginDto {

    @Schema(name = "AdminLoginRequest")
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

    /**
     * accessToken + adminInfo(id, name, role) 반환.
     * 프론트가 sessionStorage 부재 상황(탭 재오픈 등)에서 refresh 만으로 세션(토큰·역할·이름)을 완전 복원할 수 있도록
     * 로그인 응답과 동일하게 adminInfo를 함께 내려준다.
     */
    public record TokenRefreshResponse(String accessToken, AdminInfo adminInfo) {}

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
