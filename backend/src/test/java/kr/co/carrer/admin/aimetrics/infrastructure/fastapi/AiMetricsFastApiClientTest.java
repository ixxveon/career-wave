package kr.co.carrer.admin.aimetrics.infrastructure.fastapi;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.admin.aimetrics.service.AiMetricsFastApiGateway;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import static org.assertj.core.api.Assertions.assertThat;

class AiMetricsFastApiClientTest {

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";
    private static final String WEBHOOK_SECRET = "test-internal-secret";

    private MockWebServer mockWebServer;
    private AiMetricsFastApiClient client;

    @BeforeEach
    void setUp() throws Exception {
        mockWebServer = new MockWebServer();
        mockWebServer.start();

        client = new AiMetricsFastApiClient(WebClient.builder(), new ObjectMapper());
        ReflectionTestUtils.setField(client, "fastApiBaseUrl", mockWebServer.url("/").toString());
        ReflectionTestUtils.setField(client, "webhookSecret", WEBHOOK_SECRET);
        client.init();
    }

    @AfterEach
    void tearDown() throws Exception {
        mockWebServer.shutdown();
    }

    @Test
    @DisplayName("Includes internal secret header on FastAPI POST requests")
    void includesInternalSecretHeaderOnPostRequests() throws Exception {
        mockWebServer.enqueue(jsonResponse(
                """
                        {
                          "totalRequests": 10,
                          "totalInputTokens": 1000,
                          "totalOutputTokens": 400,
                          "totalCost": 12.50,
                          "documentRequests": 6,
                          "interviewRequests": 4,
                          "adminCsRequests": 0,
                          "adminReportRequests": 0,
                          "activeModelId": 1,
                          "activeModelName": "gpt-4o-mini"
                        }
                        """
        ));

        client.getSummary(new AiMetricsFastApiGateway.SummaryRequest(
                "2026-06-01T00:00:00Z",
                "2026-06-02T00:00:00Z",
                null
        ));

        RecordedRequest request = mockWebServer.takeRequest();
        assertThat(request.getMethod()).isEqualTo("POST");
        assertThat(request.getPath()).isEqualTo("/internal/admin/ai-metrics/usage/summary");
        assertThat(request.getHeader(INTERNAL_SECRET_HEADER)).isEqualTo(WEBHOOK_SECRET);
    }

    @Test
    @DisplayName("Includes internal secret header on FastAPI DELETE requests")
    void includesInternalSecretHeaderOnDeleteRequests() throws Exception {
        mockWebServer.enqueue(jsonResponse(
                """
                        {
                          "deleted": true,
                          "ragDocumentId": 7
                        }
                        """
        ));

        AiMetricsFastApiGateway.RagIndexDeleteResponse response = client.deleteRagIndex(
                new AiMetricsFastApiGateway.RagIndexDeleteRequest(
                        7L,
                        null,
                        "/rag/2026/06/faq.pdf"
                )
        );

        RecordedRequest request = mockWebServer.takeRequest();
        assertThat(response.deleted()).isTrue();
        assertThat(request.getMethod()).isEqualTo("DELETE");
        assertThat(request.getPath()).isEqualTo("/internal/admin/ai-metrics/rag-documents/7/index");
        assertThat(request.getHeader(INTERNAL_SECRET_HEADER)).isEqualTo(WEBHOOK_SECRET);
    }

    private MockResponse jsonResponse(String body) {
        return new MockResponse()
                .setHeader("Content-Type", "application/json")
                .setResponseCode(200)
                .setBody(body);
    }
}
