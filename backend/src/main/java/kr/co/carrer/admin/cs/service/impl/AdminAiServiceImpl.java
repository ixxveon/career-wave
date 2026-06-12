package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.AiDTO;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.service.AdminAiService;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminAiServiceImpl implements AdminAiService {

    private final WebClient.Builder webClientBuilder;

    @Value("${fastapi.base-url}")
    private String fastApiBaseUrl;

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    @Override
    public AiDTO.ResponseDraft generateNoticeDraft(AiDTO.RequestNoticeDraft dto) {
        return callFastApi("/api/v1/ai/notice-draft", Map.of(
            "category", dto.category().name(),
            "title", dto.title()
        ));
    }

    @Override
    public AiDTO.ResponseDraft generateFaqDraft(AiDTO.RequestFaqDraft dto) {
        return callFastApi("/api/v1/ai/faq-draft", Map.of(
            "question", dto.question()
        ));
    }

    @Override
    public AiDTO.ResponseDraft generateInquiryDraft(AiDTO.RequestInquiryDraft dto) {
        return callFastApi("/api/v1/ai/inquiry-draft", Map.of(
            "category", dto.category().name(),
            "title", dto.title(),
            "content", dto.content()
        ));
    }

    private AiDTO.ResponseDraft callFastApi(String path, Map<String, Object> body) {
        try {
            Map<?, ?> response = webClientBuilder.baseUrl(fastApiBaseUrl).build()
                .post()
                .uri(path)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(TIMEOUT)
                .block();

            String draft = response != null ? (String) response.get("draft") : null;
            if (draft == null || draft.isBlank()) {
                log.error("[AdminAiService] FastAPI 응답에 draft 누락 또는 비어있음: path={}", path);
                throw new CustomException(AdminCsErrorCode.AI_SERVER_UNAVAILABLE);
            }
            return new AiDTO.ResponseDraft(draft);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("[AdminAiService] FastAPI 호출 실패: path={}, 원인={}", path, e.getMessage());
            throw new CustomException(AdminCsErrorCode.AI_SERVER_UNAVAILABLE);
        }
    }
}
