package kr.co.carrer.user.member.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * 값을 유니코드 NFC로 정규화한 뒤 정규식과 매칭하는 제약 (#1030).
 *
 * <p>{@code @Pattern}은 입력값을 그대로 매칭하므로, NFD(자모 분해형, U+1100~U+11FF)로
 * 인코딩된 정상 한글 이름이 {@code [가-힣]}(완성형 U+AC00~U+D7A3)에 매칭되지 않아
 * 거짓 거부될 수 있다. 이 제약은 매칭 전에 NFC 정규화를 수행해 그 문제를 방지한다.
 *
 * <p>null은 매칭하지 않고 통과시킨다({@code @NotBlank}가 별도로 처리).
 */
@Documented
@Constraint(validatedBy = NormalizedPatternValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface NormalizedPattern {

    String regexp();

    String message() default "형식이 올바르지 않습니다.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
