package kr.co.carrer.admin.cs.service;

import kr.co.carrer.admin.cs.dto.AiDTO;

public interface AdminAiService {
    AiDTO.ResponseDraft generateNoticeDraft(AiDTO.RequestNoticeDraft dto);
    AiDTO.ResponseDraft generateFaqDraft(AiDTO.RequestFaqDraft dto);
    AiDTO.ResponseDraft generateInquiryDraft(AiDTO.RequestInquiryDraft dto);
}
