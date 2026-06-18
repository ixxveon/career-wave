package kr.co.carrer.user.member.infrastructure.business;

import jakarta.annotation.PostConstruct;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.service.BusinessRegistrationVerificationPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * 공공데이터포털 국세청 사업자등록정보 상태조회(status) API 연동.
 * businessNumber만으로 조회 (spec §8.1: start_dt/p_nm/ceoName/certificateNumber 파라미터 미사용).
 * 정상(01) → true, 휴업(02)/폐업(03)/미등록/오류 → false 또는 예외.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NtsBusinessStatusApiAdapter implements BusinessRegistrationVerificationPort {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final String VALID_STATUS_CODE = "01";

    private final WebClient.Builder webClientBuilder;

    @Value("${nts.api.base-url}") private String baseUrl;
    @Value("${nts.api.key}") private String serviceKey;

    private WebClient webClient;

    @PostConstruct
    void init() {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
    }

    @Override
    public boolean verify(String businessNumber) {
        Map<String, Object> requestBody = Map.of(
                "b_no", List.of(businessNumber)
        );

        NtsStatusResponse response;
        try {
            response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/status")
                            .queryParam("serviceKey", serviceKey)
                            .build())
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, r ->
                            r.releaseBody().then(Mono.just(
                                    new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE))))
                    .bodyToMono(NtsStatusResponse.class)
                    .timeout(TIMEOUT)
                    .block();
        } catch (CustomException e) {
            throw e;
        } catch (WebClientResponseException e) {
            log.error("NTS API 호출 실패: HTTP {}", e.getStatusCode());
            throw new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE);
        } catch (RuntimeException e) {
            log.error("NTS API 호출 실패: {}", e.getMessage());
            throw new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE);
        }

        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE);
        }

        String statusCode = response.data().get(0).b_stt_cd();
        if (statusCode == null) {
            throw new CustomException(UserAuthErrorCode.COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE);
        }

        // 01=계속사업자(정상), 02=휴업자, 03=폐업자
        return VALID_STATUS_CODE.equals(statusCode);
    }

    record NtsStatusResponse(String status_code, List<NtsBizData> data) {}

    record NtsBizData(String b_no, String b_stt, String b_stt_cd, String tax_type) {}
}
