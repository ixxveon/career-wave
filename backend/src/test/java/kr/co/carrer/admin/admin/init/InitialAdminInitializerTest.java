package kr.co.carrer.admin.admin.init;

import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.repository.AdminRepository;
import kr.co.carrer.admin.admin.type.AdminRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class InitialAdminInitializerTest {

    @InjectMocks
    private InitialAdminInitializer initialAdminInitializer;

    @Mock
    private AdminRepository adminRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private void setProps(String loginId, String email, String password, String name, AdminRole role) {
        ReflectionTestUtils.setField(initialAdminInitializer, "initLoginId", loginId);
        ReflectionTestUtils.setField(initialAdminInitializer, "initEmail", email);
        ReflectionTestUtils.setField(initialAdminInitializer, "initPassword", password);
        ReflectionTestUtils.setField(initialAdminInitializer, "initName", name);
        ReflectionTestUtils.setField(initialAdminInitializer, "initRole", role);
    }

    @Nested
    @DisplayName("환경변수 미설정")
    class WhenEnvNotConfigured {

        @Test
        @DisplayName("loginId/email/password가 비어있으면 아무 것도 하지 않는다")
        void skipsWhenBlank() {
            setProps("", "", "", "슈퍼관리자", AdminRole.MASTER);

            initialAdminInitializer.run(null);

            verifyNoInteractions(adminRepository, passwordEncoder);
        }

        @Test
        @DisplayName("loginId만 비어있어도 건너뛴다")
        void skipsWhenLoginIdBlank() {
            setProps("", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", AdminRole.MASTER);

            initialAdminInitializer.run(null);

            verifyNoInteractions(adminRepository, passwordEncoder);
        }

        @Test
        @DisplayName("password만 비어있어도 건너뛴다")
        void skipsWhenPasswordBlank() {
            setProps("admin1234", "admin@careerwave.kr", "", "슈퍼관리자", AdminRole.MASTER);

            initialAdminInitializer.run(null);

            verifyNoInteractions(adminRepository, passwordEncoder);
        }
    }

    @Nested
    @DisplayName("환경변수 설정됨")
    class WhenEnvConfigured {

        @Test
        @DisplayName("동일 loginId 관리자가 이미 있으면 재생성하지 않는다")
        void skipsWhenAlreadyExists() {
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", AdminRole.MASTER);
            given(adminRepository.existsByLoginId("admin1234")).willReturn(true);

            initialAdminInitializer.run(null);

            verify(adminRepository, never()).save(any(Admin.class));
            verifyNoInteractions(passwordEncoder);
        }

        @Test
        @DisplayName("관리자가 없으면 비밀번호를 인코딩해 새 계정을 생성한다")
        void createsWhenAbsent() {
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", AdminRole.MASTER);
            given(adminRepository.existsByLoginId("admin1234")).willReturn(false);
            given(passwordEncoder.encode("Str0ng!Passw0rd")).willReturn("{bcrypt}encoded");

            initialAdminInitializer.run(null);

            verify(passwordEncoder).encode("Str0ng!Passw0rd");
            verify(adminRepository).save(any(Admin.class));
        }
    }
}
