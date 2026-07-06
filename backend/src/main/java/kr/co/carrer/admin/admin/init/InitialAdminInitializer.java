package kr.co.carrer.admin.admin.init;

import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.repository.AdminRepository;
import kr.co.carrer.admin.admin.type.AdminRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

// INITIAL_ADMIN_LOGIN_ID/PASSWORD가 설정된 경우에만 최초 기동 시 관리자 계정을 생성한다.
// 이미 동일 loginId의 관리자가 있으면 건너뛰므로 재기동/재배포에도 안전하게 반복 실행 가능하다.
@Slf4j
@Component
@RequiredArgsConstructor
public class InitialAdminInitializer implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.init.login-id:}")
    private String initLoginId;

    @Value("${admin.init.email:}")
    private String initEmail;

    @Value("${admin.init.password:}")
    private String initPassword;

    @Value("${admin.init.name:슈퍼관리자}")
    private String initName;

    @Value("${admin.init.role:MASTER}")
    private AdminRole initRole;

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(initLoginId) || !StringUtils.hasText(initEmail) || !StringUtils.hasText(initPassword)) {
            return;
        }
        if (adminRepository.existsByLoginId(initLoginId)) {
            log.info("초기 관리자 계정이 이미 존재하여 생성을 건너뜁니다 [loginId={}]", initLoginId);
            return;
        }

        Admin admin = Admin.create(initLoginId, initEmail, passwordEncoder.encode(initPassword), initName, initRole);
        adminRepository.save(admin);
        log.info("초기 관리자 계정을 생성했습니다 [loginId={}, role={}]", initLoginId, initRole);
    }
}
