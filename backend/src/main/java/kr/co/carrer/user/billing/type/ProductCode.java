package kr.co.carrer.user.billing.type;

import java.util.List;
import java.util.Optional;

public enum ProductCode {

    DOCUMENT_COACHING(
            "document-coaching",
            "서류 AI 코칭",
            "이력서와 자기소개서 AI 분석",
            List.of("서류 분석", "피드백 리포트", "개선 제안"),
            "analysis"
    ),
    INTERVIEW(
            "interview",
            "AI 모의면접",
            "텍스트/음성 기반 AI 면접 연습",
            List.of("모의면접", "AI 피드백", "리포트"),
            "session"
    );

    private final String code;
    private final String displayName;
    private final String description;
    private final List<String> features;
    private final String usageUnit;

    ProductCode(String code, String displayName, String description,
                List<String> features, String usageUnit) {
        this.code = code;
        this.displayName = displayName;
        this.description = description;
        this.features = features;
        this.usageUnit = usageUnit;
    }

    public String code() {
        return code;
    }

    public String displayName() {
        return displayName;
    }

    public String description() {
        return description;
    }

    public List<String> features() {
        return features;
    }

    public String usageUnit() {
        return usageUnit;
    }

    public static Optional<ProductCode> fromCode(String code) {
        for (ProductCode value : values()) {
            if (value.code.equals(code)) {
                return Optional.of(value);
            }
        }
        return Optional.empty();
    }
}
