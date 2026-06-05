package kr.co.carrer.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    // 관리자 인증 — 비로그인 공개 API (/api/v1/admin/{domain})
                    "/api/v1/admin/auth/**",
                    // 회원 인증 — 비로그인 공개 API (/api/v1/user/members/*)
                    "/api/v1/user/members/login",
                    "/api/v1/user/members/login-id/check",
                    "/api/v1/user/members/token/refresh",
                    "/api/v1/user/members/register/user",
                    "/api/v1/user/members/register/company",
                    "/api/v1/user/members/register/social/complete",
                    "/api/v1/user/members/company/employment-certificate",
                    "/api/v1/user/members/verifications/send",
                    "/api/v1/user/members/verifications/confirm",
                    "/api/v1/user/members/recovery/find-id",
                    "/api/v1/user/members/recovery/password-token",
                    "/api/v1/user/members/recovery/reset-password"
                ).permitAll()
                .requestMatchers("/api/v1/admin/scraping/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
