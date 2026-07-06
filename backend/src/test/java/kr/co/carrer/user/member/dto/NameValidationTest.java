package kr.co.carrer.user.member.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.lang.reflect.Field;
import java.text.Normalizer;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 이름 계열 필드(@NormalizedPattern / @Pattern)의 유효성 검사 회귀 테스트 (#1030).
 *
 * <p>request DTO들은 @Getter만 있고 setter/builder가 없어, 리플렉션으로 대상 필드만 세팅한 뒤
 * Bean Validator를 돌려 "해당 필드(propertyPath)"에 위반이 잡히는지로 검증한다.
 * 다른 @NotBlank 필드의 위반은 무시하고, 오직 대상 필드에 대한 위반 유무만 본다.
 */
class NameValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    private static void setField(Object target, String fieldName, String value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    private boolean hasViolationOn(Object target, String property) {
        Set<ConstraintViolation<Object>> violations = validator.validate(target);
        return violations.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals(property));
    }

    // ───────────────── 개인가입 이름 (한글 2~10자) ─────────────────

    @ParameterizedTest
    @ValueSource(strings = {"홍길동", "김수", "가나다라마바사아자차"}) // 2자, 3자, 10자 한글
    @DisplayName("개인가입 이름: 정상 한글 이름은 위반이 없다")
    void personalName_valid(String value) throws Exception {
        var dto = new UserRegisterDto.RequestPersonalRegister();
        setField(dto, "name", value);
        assertThat(hasViolationOn(dto, "name")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"sss", "12345", "홍", "ㅋㅋㅋㅋ", "홍길동입니다반갑습니다요"}) // 영문/숫자/1자/자모/11자
    @DisplayName("개인가입 이름: 비실명 값은 위반이 잡힌다")
    void personalName_invalid(String value) throws Exception {
        var dto = new UserRegisterDto.RequestPersonalRegister();
        setField(dto, "name", value);
        assertThat(hasViolationOn(dto, "name")).isTrue();
    }

    // ───────────────── 소셜 가입 이름 (한글 2~10자) ─────────────────

    @ParameterizedTest
    @ValueSource(strings = {"홍길동", "이몽룡"})
    @DisplayName("소셜 가입 이름: 정상 한글 이름은 위반이 없다")
    void socialName_valid(String value) throws Exception {
        var dto = new UserSocialAuthDto.RequestSocialComplete();
        setField(dto, "name", value);
        assertThat(hasViolationOn(dto, "name")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"zzzzzzz", "홍길동123", "ㅋㅋㅋ", "John"})
    @DisplayName("소셜 가입 이름: 비실명 값은 위반이 잡힌다")
    void socialName_invalid(String value) throws Exception {
        var dto = new UserSocialAuthDto.RequestSocialComplete();
        setField(dto, "name", value);
        assertThat(hasViolationOn(dto, "name")).isTrue();
    }

    // ───────────────── 기업 담당자명 (한글 2~10자) ─────────────────

    @ParameterizedTest
    @ValueSource(strings = {"김담당", "이담당자"})
    @DisplayName("기업 담당자명: 정상 한글 이름은 위반이 없다")
    void managerName_valid(String value) throws Exception {
        var dto = new UserRegisterDto.RequestCompanyRegister();
        setField(dto, "managerName", value);
        assertThat(hasViolationOn(dto, "managerName")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"올모아아ㅏㅏ", "manager", "12", "김"})
    @DisplayName("기업 담당자명: 비실명 값은 위반이 잡힌다")
    void managerName_invalid(String value) throws Exception {
        var dto = new UserRegisterDto.RequestCompanyRegister();
        setField(dto, "managerName", value);
        assertThat(hasViolationOn(dto, "managerName")).isTrue();
    }

    // ───────────────── 기업 대표자명 (한/영+공백 2~20자) ─────────────────

    @ParameterizedTest
    @ValueSource(strings = {"이대표", "John Smith", "Robert De Niro", "김대표"})
    @DisplayName("기업 대표자명: 한글/영문/공백 이름은 위반이 없다 (외국계 대표 허용)")
    void ceoName_valid(String value) throws Exception {
        var dto = new UserRegisterDto.RequestCompanyRegister();
        setField(dto, "ceoName", value);
        assertThat(hasViolationOn(dto, "ceoName")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"루언111", "대표@", "ㅋㅋ", "A", "김이박최정한윤장임신오서권황안송류전홍고문양손배백허유남심"}) // 숫자/기호/자모/1자/21자
    @DisplayName("기업 대표자명: 숫자·기호·자모·길이초과는 위반이 잡힌다")
    void ceoName_invalid(String value) throws Exception {
        var dto = new UserRegisterDto.RequestCompanyRegister();
        setField(dto, "ceoName", value);
        assertThat(hasViolationOn(dto, "ceoName")).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"AB\nCD", "김\t대표", "이\r대표"}) // 개행/탭/캐리지리턴
    @DisplayName("기업 대표자명: 공백이 아닌 화이트스페이스(개행·탭)는 거절된다 (\\s → 리터럴 공백)")
    void ceoName_rejectsNonSpaceWhitespace(String value) throws Exception {
        var dto = new UserRegisterDto.RequestCompanyRegister();
        setField(dto, "ceoName", value);
        assertThat(hasViolationOn(dto, "ceoName")).isTrue();
    }

    // ───────────────── NFD(자모 분해형) 정규화 ─────────────────

    @Test
    @DisplayName("NFD로 인코딩된 정상 한글 이름은 NFC 정규화 후 통과한다 (개인/소셜/담당자명)")
    void nfdEncodedKoreanName_passesAfterNormalization() throws Exception {
        String nfd = Normalizer.normalize("홍길동", Normalizer.Form.NFD);
        // 전제: NFD가 실제로 분해되어 원본과 다른 코드포인트임을 확인
        assertThat(nfd).isNotEqualTo("홍길동");

        var personal = new UserRegisterDto.RequestPersonalRegister();
        setField(personal, "name", nfd);
        assertThat(hasViolationOn(personal, "name")).isFalse();

        var social = new UserSocialAuthDto.RequestSocialComplete();
        setField(social, "name", nfd);
        assertThat(hasViolationOn(social, "name")).isFalse();

        var company = new UserRegisterDto.RequestCompanyRegister();
        setField(company, "managerName", nfd);
        assertThat(hasViolationOn(company, "managerName")).isFalse();
    }

    @Test
    @DisplayName("NFD로 인코딩된 정상 한글 대표자명도 NFC 정규화 후 통과한다")
    void nfdEncodedCeoName_passesAfterNormalization() throws Exception {
        String nfd = Normalizer.normalize("이대표", Normalizer.Form.NFD);
        assertThat(nfd).isNotEqualTo("이대표");
        var dto = new UserRegisterDto.RequestCompanyRegister();
        setField(dto, "ceoName", nfd);
        assertThat(hasViolationOn(dto, "ceoName")).isFalse();
    }
}
