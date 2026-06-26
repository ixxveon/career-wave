package kr.co.carrer.admin.cs.service;

import kr.co.carrer.admin.cs.dto.AiDTO;

public interface AdminAiService {
    AiDTO.ResponseDraft generateNoticeDraft(AiDTO.RequestNoticeDraft dto, long adminId);
    AiDTO.ResponseDraft generateFaqDraft(AiDTO.RequestFaqDraft dto, long adminId);
    AiDTO.ResponseDraft generateInquiryDraft(AiDTO.RequestInquiryDraft dto, long adminId);
}
