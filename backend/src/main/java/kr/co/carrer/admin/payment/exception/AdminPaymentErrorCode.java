package kr.co.carrer.admin.payment.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdminPaymentErrorCode implements BaseErrorCode {

    PAYMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 결제 건입니다."),
    REFUND_NOT_PENDING(HttpStatus.CONFLICT, "이미 처리된 환불 건입니다."),
    REFUND_ALREADY_PENDING(HttpStatus.CONFLICT, "이미 환불 요청이 접수된 결제입니다."),
    PAYMENT_NOT_REFUNDABLE(HttpStatus.CONFLICT, "환불 가능한 상태의 결제가 아닙니다."),
    REJECT_REASON_REQUIRED(HttpStatus.BAD_REQUEST, "환불 불가 처리 사유를 입력해주세요."),
    TOSS_REFUND_FAILED(HttpStatus.BAD_GATEWAY, "Toss 환불 처리에 실패했습니다. 잠시 후 다시 시도해주세요."),
    TOSS_REFUND_AMBIGUOUS(HttpStatus.SERVICE_UNAVAILABLE, "Toss 취소 요청 결과를 확인할 수 없습니다. Toss 대시보드에서 실제 취소 여부를 확인한 후 처리해주세요."),
    PAYMENT_INVALID_STATUS_TRANSITION(HttpStatus.CONFLICT, "현재 결제 상태에서 허용되지 않는 전이입니다."),
    PAYMENT_INVALID_PARAM(HttpStatus.BAD_REQUEST, "결제 파라미터가 올바르지 않습니다."),
    REFUND_APPROVAL_FORBIDDEN(HttpStatus.FORBIDDEN, "환불 승인/거절은 MASTER 권한만 가능합니다.");

    private final HttpStatus status;
    private final String message;
}
