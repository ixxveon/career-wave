package kr.co.carrer.user.billing.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TossBillingAuthResponse(
        // billingKey는 로그·응답에 절대 포함 금지 — AesCipher로 즉시 암호화 후 사용
        String billingKey,
        String customerKey,
        ZonedDateTime authenticatedAt,
        CardInfo card
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CardInfo(
            String company,
            String number   // Toss가 반환하는 마스킹 값 — 원본 카드번호 아님
    ) {}
}
