package kr.co.carrer.admin.aimetrics.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiOpsSettingTest {

    @Test
    @DisplayName("신규 운영 설정 저장 시 싱글톤 ID 1이 자동으로 세팅된다")
    void onCreate_shouldAssignSingletonId() {
        AiOpsSetting setting = new AiOpsSetting();

        setting.onCreate();

        assertThat(readId(setting)).isEqualTo(1L);
        assertThat(setting.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("싱글톤이 아닌 ID로 저장하려 하면 예외가 발생한다")
    void onCreate_shouldRejectNonSingletonId() throws Exception {
        AiOpsSetting setting = new AiOpsSetting();
        writeId(setting, 2L);

        assertThatThrownBy(setting::onCreate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("AiOpsSetting ID must always be 1.");
    }

    private Long readId(AiOpsSetting setting) {
        try {
            Field field = AiOpsSetting.class.getDeclaredField("aiOpsSettingId");
            field.setAccessible(true);
            return (Long) field.get(setting);
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError(exception);
        }
    }

    private void writeId(AiOpsSetting setting, Long value) throws Exception {
        Field field = AiOpsSetting.class.getDeclaredField("aiOpsSettingId");
        field.setAccessible(true);
        field.set(setting, value);
    }
}
