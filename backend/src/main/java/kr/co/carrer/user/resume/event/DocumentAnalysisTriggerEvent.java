package kr.co.carrer.user.resume.event;

import kr.co.carrer.user.resume.dto.ResumeDTO;

import java.util.List;
import java.util.UUID;

/**
 * Document 저장 후 DB 커밋이 끝난 시점에 FastAPI 분석 트리거를 호출하기 위한 이벤트.
 * @TransactionalEventListener(phase = AFTER_COMMIT) 에서 수신한다.
 */
public record DocumentAnalysisTriggerEvent(
        UUID documentId,
        String fileType,
        // RESUME 전용
        String fileUrl,
        String originalName,
        // COVER_LETTER 전용
        String company,
        String job,
        List<ResumeDTO.RequestCoverLetter.ContentItem> content
) {
    public static DocumentAnalysisTriggerEvent ofResume(UUID documentId, String fileUrl, String originalName) {
        return new DocumentAnalysisTriggerEvent(documentId, "RESUME", fileUrl, originalName, null, null, null);
    }

    public static DocumentAnalysisTriggerEvent ofCoverLetter(UUID documentId, String company, String job,
                                                              List<ResumeDTO.RequestCoverLetter.ContentItem> content) {
        return new DocumentAnalysisTriggerEvent(documentId, "COVER_LETTER", null, null, company, job, content);
    }
}
