package kr.co.carrer.global.config;

import kr.co.carrer.auth.filter.JwtAuthenticationFilter;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    // admin 인증 — permitAll
                    "/api/v1/admin/auth/login",
                    "/api/v1/admin/auth/refresh",
                    // user 인증 — permitAll
                    "/api/v1/user/members/login",
                    "/api/v1/user/members/token/refresh",
                    "/api/v1/user/members/login-id/check",
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
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(
                new JwtAuthenticationFilter(jwtTokenProvider),
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
