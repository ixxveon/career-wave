package kr.co.carrer.user.resume.event;

import java.util.UUID;

/**
 * Document 저장 후 DB 커밋이 끝난 시점에 FastAPI 분석 트리거를 호출하기 위한 이벤트.
 * @TransactionalEventListener(phase = AFTER_COMMIT) 에서 수신한다.
 */
public record DocumentAnalysisTriggerEvent(
        UUID documentId,
        String fileType
) {}
