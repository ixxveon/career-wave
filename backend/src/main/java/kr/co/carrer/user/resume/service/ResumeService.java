package kr.co.carrer.user.resume.service;

import kr.co.carrer.user.resume.dto.ResumeDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface ResumeService {

    ResumeDTO.ResponseUpload uploadResume(UUID memberId, MultipartFile file);

    ResumeDTO.ResponseCoverLetter submitCoverLetter(UUID memberId, ResumeDTO.RequestCoverLetter dto);

    ResumeDTO.ResponseFeedback getFeedback(UUID memberId, UUID documentId);

    void markDocumentFailed(UUID documentId, String errorMessage);
}
