package kr.co.carrer.user.jobnotice.controller;

import kr.co.carrer.auth.exception.JwtAccessDeniedHandler;
import kr.co.carrer.auth.exception.JwtAuthenticationEntryPoint;
import kr.co.carrer.global.config.SecurityConfig;
import kr.co.carrer.support.SecurityMockConfig;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import kr.co.carrer.user.jobnotice.service.UserJobNoticeService;
import kr.co.carrer.user.jobnotice.type.CareerLevel;
import kr.co.carrer.user.jobnotice.type.CompanySize;
import kr.co.carrer.user.jobnotice.type.JobNoticeStatus;
import kr.co.carrer.user.jobnotice.type.JobType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserJobNoticeController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class, SecurityMockConfig.class})
class UserJobNoticeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserJobNoticeService userJobNoticeService;

    @Test
    @DisplayName("목록 조회 응답은 ApiResponse 래퍼와 1-based 페이지 형식을 유지한다")
    void getJobNotices_returnsApiResponseWithOneBasedPage() throws Exception {
        JobNoticeDTO.ResponseSummary summary = new JobNoticeDTO.ResponseSummary(
                101L,
                "CareerWave",
                "백엔드 개발자",
                List.of("Java", "Spring Boot"),
                JobType.FULLTIME,
                CompanySize.STARTUP,
                List.of("BACKEND"),
                CareerLevel.JUNIOR,
                "Seoul",
                "면접 후 협의",
                JobNoticeStatus.ACTIVE,
                "WANTED",
                123,
                LocalDate.of(2026, 6, 30),
                ZonedDateTime.parse("2026-06-01T00:00:00Z"),
                false,
                "https://cdn.example.com/careerwave.png"
        );
        JobNoticeDTO.ResponseList response = new JobNoticeDTO.ResponseList(
                List.of(summary),
                1,
                20,
                1,
                1,
                new JobNoticeDTO.ResponseListStats(10, 2, null, 20.0),
                new JobNoticeDTO.ResponseFilterOptions(
                        List.of("FULLTIME", "INTERN", "CONTRACT"),
                        List.of("BACKEND"),
                        List.of("JUNIOR", "SENIOR", "ANY"),
                        List.of("Seoul"),
                        List.of("STARTUP", "SME", "MID_MARKET", "LARGE")
                )
        );

        when(userJobNoticeService.getJobNotices(
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                isNull(),
                org.mockito.ArgumentMatchers.eq(1),
                org.mockito.ArgumentMatchers.eq(20),
                isNull()
        )).thenReturn(response);

        mockMvc.perform(get("/api/v1/user/job-notices"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.code").doesNotExist())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(20))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(1))
                .andExpect(jsonPath("$.data.stats.totalOpenCount").value(10))
                .andExpect(jsonPath("$.data.stats.todayNewCount").value(2))
                .andExpect(jsonPath("$.data.filterOptions.jobType[0]").value("FULLTIME"))
                .andExpect(jsonPath("$.data.filterOptions.jobCategory[0]").value("BACKEND"))
                .andExpect(jsonPath("$.data.content[0].jobNoticeId").value(101))
                .andExpect(jsonPath("$.data.content[0].bookmarked").value(false));
    }
}
