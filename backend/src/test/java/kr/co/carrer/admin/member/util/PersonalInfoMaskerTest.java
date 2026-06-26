package kr.co.carrer.admin.member.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PersonalInfoMaskerTest {

    @Nested
    @DisplayName("이름 마스킹 - maskName()")
    class MaskName {

        @Test
        @DisplayName("3글자 이름: 홍길동 → 홍*동")
        void threeChars() {
            assertThat(PersonalInfoMasker.maskName("홍길동")).isEqualTo("홍*동");
        }

        @Test
        @DisplayName("2글자 이름: 이준 → 이*")
        void twoChars() {
            assertThat(PersonalInfoMasker.maskName("이준")).isEqualTo("이*");
        }

        @Test
        @DisplayName("4글자 이름도 별표 1개 고정: 남궁세현 → 남*현")
        void fourChars() {
            assertThat(PersonalInfoMasker.maskName("남궁세현")).isEqualTo("남*현");
        }

        @Test
        @DisplayName("null 입력 시 null 반환")
        void nullInput() {
            assertThat(PersonalInfoMasker.maskName(null)).isNull();
        }

        @Test
        @DisplayName("1글자 이름은 그대로 반환")
        void singleChar() {
            assertThat(PersonalInfoMasker.maskName("김")).isEqualTo("김");
        }
    }

    @Nested
    @DisplayName("이메일 마스킹 - maskEmail()")
    class MaskEmail {

        @Test
        @DisplayName("일반 이메일: hong@gmail.com → hon***@gmail.com")
        void normalEmail() {
            assertThat(PersonalInfoMasker.maskEmail("hong@gmail.com")).isEqualTo("hon***@gmail.com");
        }

        @Test
        @DisplayName("짧은 로컬파트: ab@x.com → ab***@x.com")
        void shortLocal() {
            assertThat(PersonalInfoMasker.maskEmail("ab@x.com")).isEqualTo("ab***@x.com");
        }

        @Test
        @DisplayName("긴 로컬파트: username@domain.co.kr → use***@domain.co.kr")
        void longLocal() {
            assertThat(PersonalInfoMasker.maskEmail("username@domain.co.kr")).isEqualTo("use***@domain.co.kr");
        }

        @Test
        @DisplayName("null 입력 시 null 반환")
        void nullInput() {
            assertThat(PersonalInfoMasker.maskEmail(null)).isNull();
        }

        @Test
        @DisplayName("@ 없는 문자열은 그대로 반환")
        void noAtSign() {
            assertThat(PersonalInfoMasker.maskEmail("noemail")).isEqualTo("noemail");
        }
    }

    @Nested
    @DisplayName("로그인ID 마스킹 - maskLoginId()")
    class MaskLoginId {

        @Test
        @DisplayName("일반 ID: user1234 → use***")
        void normalId() {
            assertThat(PersonalInfoMasker.maskLoginId("user1234")).isEqualTo("use***");
        }

        @Test
        @DisplayName("3자 ID: abc → ab***")
        void threeCharId() {
            assertThat(PersonalInfoMasker.maskLoginId("abc")).isEqualTo("ab***");
        }

        @Test
        @DisplayName("2자 ID: ab → a***")
        void twoCharId() {
            assertThat(PersonalInfoMasker.maskLoginId("ab")).isEqualTo("a***");
        }

        @Test
        @DisplayName("1자 ID: a → ***")
        void oneCharId() {
            assertThat(PersonalInfoMasker.maskLoginId("a")).isEqualTo("***");
        }

        @Test
        @DisplayName("null 입력 시 null 반환")
        void nullInput() {
            assertThat(PersonalInfoMasker.maskLoginId(null)).isNull();
        }
    }
}
