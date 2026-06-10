package kr.co.carrer.user.resume.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.resume.dto.ResumeDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ResumeService {

    ResumeDTO.ResponseUpload uploadResume(UUID memberId, MultipartFile file);

    ResumeDTO.ResponseCoverLetter submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto);

    ResumeDTO.ResponseFeedback getFeedback(UUID memberId, UUID documentId);

    PaginationResponse<ResumeDTO.HistoryItem> getHistory(UUID memberId, int page, int size);

    void markDocumentFailed(UUID documentId, String errorMessage);

    void receiveWebhook(String webhookSecret, ResumeDTO.RequestWebhook dto);
}
