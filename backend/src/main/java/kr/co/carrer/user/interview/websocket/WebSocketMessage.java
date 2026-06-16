package kr.co.carrer.user.interview.websocket;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WebSocketMessage(
        String type,
        String content,
        Integer questionOrder,
        String subType,
        Object data,
        String errorCode
) {
    public static WebSocketMessage sessionStart() {
        return new WebSocketMessage("SYSTEM", "면접 세션이 시작되었습니다.", null, "SESSION_START", null, null);
    }

    public static WebSocketMessage reportReady(String reportUrl) {
        return new WebSocketMessage("SYSTEM", "리포트 생성이 완료되었습니다.", null, "REPORT_READY",
                new ReportReadyData(reportUrl), null);
    }

    public static WebSocketMessage error(String content, String errorCode) {
        return new WebSocketMessage("ERROR", content, null, null, null, errorCode);
    }

    public record ReportReadyData(String reportUrl) {}
}
