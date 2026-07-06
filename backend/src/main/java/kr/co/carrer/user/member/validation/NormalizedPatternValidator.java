package kr.co.carrer.user.member.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.text.Normalizer;
import java.util.regex.Pattern;

public class NormalizedPatternValidator implements ConstraintValidator<NormalizedPattern, String> {

    private Pattern pattern;

    @Override
    public void initialize(NormalizedPattern annotation) {
        this.pattern = Pattern.compile(annotation.regexp());
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null은 @NotBlank가 먼저 처리 — 여기서는 통과
        if (value == null) return true;
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFC);
        return pattern.matcher(normalized).matches();
    }
}
