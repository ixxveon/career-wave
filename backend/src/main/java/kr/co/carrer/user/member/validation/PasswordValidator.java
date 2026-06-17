package kr.co.carrer.user.member.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 64;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        // null은 @NotBlank가 먼저 처리 — 여기서는 통과
        if (value == null) return true;

        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) return false;

        boolean hasLetter = value.chars().anyMatch(Character::isLetter);
        boolean hasDigit = value.chars().anyMatch(Character::isDigit);
        // loginId 포함 금지는 DTO 레벨에서 loginId 접근 불가 — service 레이어에서 별도 검증
        boolean hasSpecial = value.chars().anyMatch(c ->
                !Character.isLetterOrDigit(c) && !Character.isWhitespace(c));

        return hasLetter && hasDigit && hasSpecial;
    }
}
