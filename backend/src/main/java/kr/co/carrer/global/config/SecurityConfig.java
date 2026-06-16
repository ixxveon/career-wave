package kr.co.carrer.global.config;

import kr.co.carrer.auth.filter.AccountStatusAuthorizationFilter;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.filter.JwtAuthenticationFilter;
import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.auth.jwt.JwtTokenProvider;
import kr.co.carrer.auth.store.TokenBlacklistStore;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(proxyTargetClass = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final TokenBlacklistStore tokenBlacklistStore;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final List<AccountStatusPort> accountStatusPorts;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Order(1)
    public SecurityFilterChain adminSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/v1/admin/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/admin/auth/login",
                    "/api/v1/admin/auth/refresh"
                ).permitAll()
                .requestMatchers("/api/v1/admin/auth/logout").authenticated()
                .anyRequest().hasRole("ADMIN")
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .addFilterBefore(
                new JwtAuthenticationFilter(jwtTokenProvider, tokenBlacklistStore),
                UsernamePasswordAuthenticationFilter.class
            )
            .addFilterAfter(
                new AccountStatusAuthorizationFilter(accountStatusPorts),
                JwtAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain userSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
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
                .requestMatchers("/ws/**").permitAll()
                // FastAPI 내부 콜백 — X-Internal-Secret 헤더로 보안 검증 (컨트롤러 레이어)
                .requestMatchers(HttpMethod.POST, "/api/v1/user/resume/webhook").permitAll()
                .requestMatchers(HttpMethod.POST, "/internal/api/v1/interview/callback/*/report").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/user/job-notices", "/api/v1/user/job-notices/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/user/notices", "/api/v1/user/notices/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/user/faqs", "/api/v1/user/faqs/*").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/user/job-notices/*/bookmarks").hasRole("USER")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/user/job-notices/*/bookmarks").hasRole("USER")
                .requestMatchers(
                    "/api/v1/user/members/logout",
                    "/api/v1/user/members/me/status"
                ).authenticated()
                .requestMatchers("/api/v1/user/**").hasAnyRole("USER", "COMPANY")
                .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            )
            .addFilterBefore(
                new JwtAuthenticationFilter(jwtTokenProvider, tokenBlacklistStore),
                UsernamePasswordAuthenticationFilter.class
            )
            .addFilterAfter(
                new AccountStatusAuthorizationFilter(accountStatusPorts),
                JwtAuthenticationFilter.class
            );

        return http.build();
    }
}
