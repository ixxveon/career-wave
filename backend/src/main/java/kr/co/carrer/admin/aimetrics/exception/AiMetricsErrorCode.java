package kr.co.carrer.admin.aimetrics.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AiMetricsErrorCode implements BaseErrorCode {

    AI_MODEL_NOT_FOUND(HttpStatus.NOT_FOUND, "활성 AI 모델을 찾을 수 없습니다."),
    AI_MODEL_EXECUTION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI 모델 실행 처리에 실패했습니다."),
    FASTAPI_GATEWAY_UNAVAILABLE(HttpStatus.INTERNAL_SERVER_ERROR, "FastAPI 게이트웨이를 사용할 수 없습니다."),
    AI_OPS_SETTING_NOT_FOUND(HttpStatus.NOT_FOUND, "AI 운영 설정을 찾을 수 없습니다."),
    AI_USAGE_LOG_CREATE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI 사용 로그 생성에 실패했습니다."),
    AI_USAGE_LOG_FETCH_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AI 사용 로그 조회에 실패했습니다."),
    INVALID_ALERT_THRESHOLD(HttpStatus.BAD_REQUEST, "유효하지 않은 알림 임계치 값입니다."),
    INVALID_MONTHLY_BUDGET(HttpStatus.BAD_REQUEST, "유효하지 않은 월 예산 값입니다."),
    RAG_DOCUMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "RAG 문서를 찾을 수 없습니다."),
    RAG_DOCUMENT_ALREADY_INDEXING(HttpStatus.CONFLICT, "현재 인덱싱 중인 RAG 문서가 있습니다."),
    RAG_DOCUMENT_UPLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "RAG 문서 업로드에 실패했습니다."),
    RAG_DOCUMENT_DOWNLOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "RAG 문서 다운로드 URL 생성에 실패했습니다."),
    RAG_DOCUMENT_INDEXING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "RAG 문서 인덱싱 시작 요청에 실패했습니다."),
    RAG_DOCUMENT_DELETE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "RAG 문서 삭제에 실패했습니다.");

    private final HttpStatus status;
    private final String message;
}
