package kr.co.carrer.user.resume.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentFeedbackRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import org.springframework.context.ApplicationEventPublisher;
import kr.co.carrer.user.resume.service.FileValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeServiceHistoryTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock private CoverLetterContentRepository coverLetterContentRepository;
    @Mock private DocumentFeedbackRepository documentFeedbackRepository;
    @Mock private FileValidator fileValidator;
    @Mock private S3Uploader s3Uploader;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private DocumentStatusService documentStatusService;
    @Spy  private ObjectMapper objectMapper;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    @Test
    @DisplayName("이력 목록 조회 시 PaginationResponse로 반환된다")
    void getHistory_returnsPaginationResponse() {
        UUID memberId = UUID.randomUUID();
        List<ResumeDTO.HistoryItem> items = List.of(
                new ResumeDTO.HistoryItem(UUID.randomUUID(), "RESUME", "COMPLETED", "이력서.pdf", null, null, 82, ZonedDateTime.now()),
                new ResumeDTO.HistoryItem(UUID.randomUUID(), "COVER_LETTER", "ANALYZING", null, "카카오", "백엔드 개발자", null, ZonedDateTime.now())
        );

        when(documentRepository.findHistoryByMemberId(eq(memberId), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(items, PageRequest.of(0, 10), 2));

        PaginationResponse<ResumeDTO.HistoryItem> response = resumeService.getHistory(memberId, 0, 10);

        assertThat(response.items()).hasSize(2);
        assertThat(response.totalItems()).isEqualTo(2);
        assertThat(response.totalPages()).isEqualTo(1);
        assertThat(response.page()).isEqualTo(0);
    }

    @Test
    @DisplayName("이력이 없으면 빈 목록을 반환한다")
    void getHistory_noItems_returnsEmpty() {
        UUID memberId = UUID.randomUUID();

        when(documentRepository.findHistoryByMemberId(eq(memberId), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PaginationResponse<ResumeDTO.HistoryItem> response = resumeService.getHistory(memberId, 0, 10);

        assertThat(response.items()).isEmpty();
        assertThat(response.totalItems()).isEqualTo(0);
        assertThat(response.totalPages()).isEqualTo(0);
    }
}
