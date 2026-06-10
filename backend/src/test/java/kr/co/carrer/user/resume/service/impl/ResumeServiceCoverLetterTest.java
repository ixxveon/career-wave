package kr.co.carrer.user.resume.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.CoverLetterContent;
import kr.co.carrer.user.resume.entity.CoverLetterMeta;
import kr.co.carrer.user.resume.entity.Document;

import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.FastApiClient;
import kr.co.carrer.user.resume.service.FileValidator;
import kr.co.carrer.user.resume.type.FileType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeServiceCoverLetterTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private CoverLetterMetaRepository coverLetterMetaRepository;
    @Mock private CoverLetterContentRepository coverLetterContentRepository;
    @Mock private FileValidator fileValidator;
    @Mock private S3Uploader s3Uploader;
    @Mock private FastApiClient fastApiClient;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    @Test
    @DisplayName("자기소개서 제출 시 Document, CoverLetterMeta, CoverLetterContent가 모두 저장된다")
    void submitCoverLetter_shouldSaveAllEntities() {
        UUID memberId = UUID.randomUUID();
        ResumeDTO.RequestCoverLetter request = new ResumeDTO.RequestCoverLetter(
                "카카오",
                "백엔드 개발자",
                List.of(
                        new ResumeDTO.RequestCoverLetter.ContentItem(1, "지원 동기", "열정이 있습니다."),
                        new ResumeDTO.RequestCoverLetter.ContentItem(2, "장점", "꼼꼼합니다.")
                )
        );

        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        when(coverLetterMetaRepository.save(any(CoverLetterMeta.class))).thenAnswer(inv -> inv.getArgument(0));
        when(coverLetterContentRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ResumeDTO.ResponseCoverLetter response = resumeService.submitCoverLetter(memberId, request);

        assertThat(response.fileType()).isEqualTo(FileType.COVER_LETTER.name());
        assertThat(response.status()).isEqualTo("UPLOADED");
        assertThat(response.createdAt()).isNotNull();

        verify(documentRepository).save(any(Document.class));
        verify(coverLetterMetaRepository).save(any(CoverLetterMeta.class));
        verify(coverLetterContentRepository).saveAll(anyList());
        verify(fastApiClient).triggerAnalysis(any(), eq(FileType.COVER_LETTER.name()), any());
    }

    @Test
    @DisplayName("자기소개서 제출 시 CoverLetterContent가 요청 문항 수만큼 저장된다")
    void submitCoverLetter_shouldSaveCorrectContentCount() {
        UUID memberId = UUID.randomUUID();
        ResumeDTO.RequestCoverLetter request = new ResumeDTO.RequestCoverLetter(
                "네이버",
                "프론트엔드 개발자",
                List.of(
                        new ResumeDTO.RequestCoverLetter.ContentItem(1, "Q1", "A1"),
                        new ResumeDTO.RequestCoverLetter.ContentItem(2, "Q2", "A2"),
                        new ResumeDTO.RequestCoverLetter.ContentItem(3, "Q3", "A3")
                )
        );

        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> inv.getArgument(0));
        when(coverLetterMetaRepository.save(any(CoverLetterMeta.class))).thenAnswer(inv -> inv.getArgument(0));
        when(coverLetterContentRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        resumeService.submitCoverLetter(memberId, request);

        verify(coverLetterContentRepository).saveAll(argThat((List<CoverLetterContent> list) -> list.size() == 3));
    }
}
