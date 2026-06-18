package kr.co.carrer.user.member.type;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

// 프론트/API는 소문자(kakao/naver/google), DB·내부 로직은 대문자(KAKAO/NAVER/GOOGLE)
public enum SocialProvider {
    KAKAO, NAVER, GOOGLE;

    @JsonValue
    public String toJsonValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static SocialProvider fromJsonValue(String value) {
        if (value == null) throw new IllegalArgumentException("provider는 필수입니다.");
        try {
            return SocialProvider.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("지원하지 않는 소셜 provider입니다: " + value);
        }
    }
}
