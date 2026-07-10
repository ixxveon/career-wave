package kr.co.carrer.admin.admin.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import kr.co.carrer.admin.admin.type.AdminRole;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class AdminManagementDTOValidationTest {

    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @ParameterizedTest
    @ValueSource(strings = {"admin user", "admin.user", "admin@user"})
    @DisplayName("관리자 생성 loginId는 공백과 허용되지 않은 특수문자를 사용할 수 없다")
    void rejectsInvalidLoginId(String loginId) {
        var request = new AdminManagementDTO.RequestCreateAdmin(
            loginId,
            "master@career-wave.com",
            "temporary-password",
            "master-admin",
            AdminRole.MASTER
        );

        var violations = validator.validate(request);

        assertThat(violations)
            .anySatisfy((violation) -> assertThat(violation.getPropertyPath().toString()).isEqualTo("loginId"));
    }

    @Test
    @DisplayName("관리자 생성 loginId는 영문, 숫자, 언더스코어, 하이픈을 사용할 수 있다")
    void acceptsValidLoginId() {
        var request = new AdminManagementDTO.RequestCreateAdmin(
            "master_admin-01",
            "master@career-wave.com",
            "temporary-password",
            "master-admin",
            AdminRole.MASTER
        );

        var violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }
}
