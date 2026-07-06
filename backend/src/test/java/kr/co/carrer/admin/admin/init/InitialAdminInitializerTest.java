package kr.co.carrer.admin.admin.init;

import kr.co.carrer.admin.admin.entity.Admin;
import kr.co.carrer.admin.admin.repository.AdminRepository;
import kr.co.carrer.admin.admin.type.AdminRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
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

    private void setProps(String loginId, String email, String password, String name, String role) {
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
            setProps("", "", "", "슈퍼관리자", "MASTER");

            initialAdminInitializer.run(null);

            verifyNoInteractions(adminRepository, passwordEncoder);
        }

        @Test
        @DisplayName("loginId만 비어있어도 건너뛴다")
        void skipsWhenLoginIdBlank() {
            setProps("", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", "MASTER");

            initialAdminInitializer.run(null);

            verifyNoInteractions(adminRepository, passwordEncoder);
        }

        @Test
        @DisplayName("password만 비어있어도 건너뛴다")
        void skipsWhenPasswordBlank() {
            setProps("admin1234", "admin@careerwave.kr", "", "슈퍼관리자", "MASTER");

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
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", "MASTER");
            given(adminRepository.existsByLoginId("admin1234")).willReturn(true);

            initialAdminInitializer.run(null);

            verify(adminRepository, never()).save(any(Admin.class));
            verifyNoInteractions(passwordEncoder);
        }

        @Test
        @DisplayName("관리자가 없으면 비밀번호를 인코딩해 새 계정을 생성한다")
        void createsWhenAbsent() {
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", "MASTER");
            given(adminRepository.existsByLoginId("admin1234")).willReturn(false);
            given(passwordEncoder.encode("Str0ng!Passw0rd")).willReturn("{bcrypt}encoded");

            initialAdminInitializer.run(null);

            verify(passwordEncoder).encode("Str0ng!Passw0rd");
            verify(adminRepository).save(any(Admin.class));
        }

        @Test
        @DisplayName("name/role이 빈 문자열이면 기본값(슈퍼관리자/MASTER)으로 대체한다")
        void fallsBackToDefaultsWhenNameAndRoleBlank() {
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "", "");
            given(adminRepository.existsByLoginId("admin1234")).willReturn(false);
            given(passwordEncoder.encode("Str0ng!Passw0rd")).willReturn("{bcrypt}encoded");

            ArgumentCaptor<Admin> captor = ArgumentCaptor.forClass(Admin.class);
            initialAdminInitializer.run(null);

            verify(adminRepository).save(captor.capture());
            assertThat(captor.getValue().getName()).isEqualTo("슈퍼관리자");
            assertThat(captor.getValue().getAdminRole()).isEqualTo(AdminRole.MASTER);
        }

        @Test
        @DisplayName("role 값이 유효하지 않으면 기본값(MASTER)으로 대체한다")
        void fallsBackToDefaultRoleWhenInvalid() {
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", "SUPER_ADMIN");
            given(adminRepository.existsByLoginId("admin1234")).willReturn(false);
            given(passwordEncoder.encode("Str0ng!Passw0rd")).willReturn("{bcrypt}encoded");

            ArgumentCaptor<Admin> captor = ArgumentCaptor.forClass(Admin.class);
            initialAdminInitializer.run(null);

            verify(adminRepository).save(captor.capture());
            assertThat(captor.getValue().getAdminRole()).isEqualTo(AdminRole.MASTER);
        }

        @Test
        @DisplayName("save 중 동시성 충돌(unique 제약 위반)이 발생해도 예외를 전파하지 않고 건너뛴다")
        void skipsWhenSaveHitsUniqueConstraintRace() {
            setProps("admin1234", "admin@careerwave.kr", "Str0ng!Passw0rd", "슈퍼관리자", "MASTER");
            given(adminRepository.existsByLoginId("admin1234")).willReturn(false);
            given(passwordEncoder.encode("Str0ng!Passw0rd")).willReturn("{bcrypt}encoded");
            willThrow(new DataIntegrityViolationException("duplicate key"))
                    .given(adminRepository).save(any(Admin.class));

            initialAdminInitializer.run(null);

            verify(adminRepository).save(any(Admin.class));
        }
    }
}
