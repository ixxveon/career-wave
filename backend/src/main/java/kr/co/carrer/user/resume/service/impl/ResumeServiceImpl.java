package kr.co.carrer.user.resume.service.impl;

import kr.co.carrer.global.s3.S3Uploader;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import kr.co.carrer.user.resume.entity.CoverLetterContent;
import kr.co.carrer.user.resume.entity.CoverLetterMeta;
import kr.co.carrer.user.resume.entity.Document;
import kr.co.carrer.user.resume.repository.CoverLetterContentRepository;
import kr.co.carrer.user.resume.repository.CoverLetterMetaRepository;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import kr.co.carrer.user.resume.service.DocumentStatusService;
import kr.co.carrer.user.resume.service.FastApiClient;
import kr.co.carrer.user.resume.service.FileValidator;
import kr.co.carrer.user.resume.service.ResumeService;
import kr.co.carrer.user.resume.type.FileType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeServiceImpl implements ResumeService {

    private final DocumentRepository documentRepository;
    private final CoverLetterMetaRepository coverLetterMetaRepository;
    private final CoverLetterContentRepository coverLetterContentRepository;
    private final FileValidator fileValidator;
    private final S3Uploader s3Uploader;
    private final FastApiClient fastApiClient;
    private final DocumentStatusService documentStatusService;

    @Transactional
    @Override
    public ResumeDTO.ResponseUpload uploadResume(UUID memberId, MultipartFile file) {
        fileValidator.validate(file);
        String extension = fileValidator.extractExtension(file);

        String fileUrl = s3Uploader.upload(file, extension);
        String originalName = file.getOriginalFilename();

        Document document = Document.ofResume(memberId, fileUrl, originalName);
        documentRepository.save(document);

        fastApiClient.triggerAnalysis(
                document.getDocumentId(),
                FileType.RESUME.name(),
                () -> documentStatusService.markFailed(document.getDocumentId(), "FastAPI 분석 트리거 실패")
        );

        return new ResumeDTO.ResponseUpload(
                document.getDocumentId(),
                document.getStatus().name(),
                document.getFileUrl(),
                document.getOriginalName(),
                document.getFileType().name(),
                document.getCreatedAt()
        );
    }

    @Transactional
    @Override
    public ResumeDTO.ResponseCoverLetter submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto) {
        Document document = Document.ofCoverLetter(memberId);
        documentRepository.save(document);

        CoverLetterMeta meta = CoverLetterMeta.of(document.getDocumentId(), dto.company(), dto.job());
        coverLetterMetaRepository.save(meta);

        List<CoverLetterContent> contents = dto.content().stream()
                .map(item -> CoverLetterContent.of(
                        document.getDocumentId(),
                        item.order(),
                        item.question(),
                        item.answer()
                ))
                .toList();
        coverLetterContentRepository.saveAll(contents);

        fastApiClient.triggerAnalysis(
                document.getDocumentId(),
                FileType.COVER_LETTER.name(),
                () -> documentStatusService.markFailed(document.getDocumentId(), "FastAPI 분석 트리거 실패")
        );

        return new ResumeDTO.ResponseCoverLetter(
                document.getDocumentId(),
                document.getStatus().name(),
                document.getFileType().name(),
                document.getCreatedAt()
        );
    }
}
