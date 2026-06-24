package kr.co.carrer.user.billing.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.user.billing.dto.BillingDTO;
import kr.co.carrer.user.billing.service.SubscriptionQueryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SubscriptionReadApiContractTest {

    private final SubscriptionQueryService queryService = mock(SubscriptionQueryService.class);
    private final kr.co.carrer.user.billing.service.CancelSubscriptionService cancelService =
            mock(kr.co.carrer.user.billing.service.CancelSubscriptionService.class);

    @Test
    @DisplayName("Product 기존 필드 계약")
    void productContract() {
        BillingProductController controller = new BillingProductController(queryService);
        given(queryService.getProducts()).willReturn(List.of(new BillingDTO.ProductItem(
                "document-coaching", "서류 AI 코칭", "설명", 29000,
                "KRW", "MONTHLY", List.of("서류 분석"), true, 30
        )));

        ResponseEntity<ApiResponse<List<BillingDTO.ProductItem>>> response = controller.getProducts();
        BillingDTO.ProductItem item = response.getBody().getData().get(0);

        assertThat(item.productCode()).isEqualTo("document-coaching");
        assertThat(item.name()).isEqualTo("서류 AI 코칭");
        assertThat(item.description()).isNotBlank();
        assertThat(item.price()).isEqualTo(29000);
        assertThat(item.currency()).isEqualTo("KRW");
        assertThat(item.billingCycle()).isEqualTo("MONTHLY");
        assertThat(item.features()).isNotEmpty();
        assertThat(item.active()).isTrue();
    }

    @Test
    @DisplayName("Subscription 기존 9개 필드 계약")
    void subscriptionContract() {
        UUID memberId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        ZonedDateTime now = ZonedDateTime.now();
        AuthPrincipal principal = new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);
        SubscriptionController controller = new SubscriptionController(queryService, cancelService);
        given(queryService.getMySubscriptions(memberId)).willReturn(
                new BillingDTO.ResponseSubscriptionList(List.of(new BillingDTO.SubscriptionItem(
                        subscriptionId, "interview", "AI 모의면접", "ACTIVE",
                        now, now, now.plusMonths(1), now.plusMonths(1), null
                )))
        );

        BillingDTO.SubscriptionItem item =
                controller.getMySubscriptions(principal).getBody().getData().subscriptions().get(0);

        assertThat(item.subscriptionId()).isEqualTo(subscriptionId);
        assertThat(item.productCode()).isEqualTo("interview");
        assertThat(item.productName()).isEqualTo("AI 모의면접");
        assertThat(item.status()).isEqualTo("ACTIVE");
        assertThat(item.startedAt()).isNotNull();
        assertThat(item.currentPeriodStart()).isNotNull();
        assertThat(item.currentPeriodEnd()).isNotNull();
        assertThat(item.nextBillingAt()).isNotNull();
        assertThat(item.cancelScheduledAt()).isNull();
    }

    @Test
    @DisplayName("UsageSummary 기존 6개 필드와 reserved 추가 필드 계약")
    void usageContract() throws Exception {
        UUID memberId = UUID.randomUUID();
        AuthPrincipal principal = new AuthPrincipal(memberId.toString(), AccountType.USER, "USER", null);
        SubscriptionController controller = new SubscriptionController(queryService, cancelService);
        ZonedDateTime resetAt = ZonedDateTime.now().plusMonths(1);
        given(queryService.getMyUsages(memberId)).willReturn(
                new BillingDTO.ResponseUsageList(List.of(new BillingDTO.UsageItem(
                        "interview", 20, 3, 16, "session", resetAt, 1
                )))
        );

        BillingDTO.UsageItem item =
                controller.getMyUsages(principal).getBody().getData().usages().get(0);

        assertThat(item.productCode()).isEqualTo("interview");
        assertThat(item.limit()).isEqualTo(20);
        assertThat(item.used()).isEqualTo(3);
        assertThat(item.remaining()).isEqualTo(16);
        assertThat(item.unit()).isEqualTo("session");
        assertThat(item.resetAt()).isEqualTo(resetAt);
        assertThat(item.reserved()).isEqualTo(1);

        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(
                controller.getMyUsages(principal).getBody().getData()));
        JsonNode usageJson = json.path("usages").get(0);
        assertThat(usageJson.has("productCode")).isTrue();
        assertThat(usageJson.has("limit")).isTrue();
        assertThat(usageJson.has("used")).isTrue();
        assertThat(usageJson.has("remaining")).isTrue();
        assertThat(usageJson.has("unit")).isTrue();
        assertThat(usageJson.has("resetAt")).isTrue();
        assertThat(usageJson.has("reserved")).isTrue();
    }
}
