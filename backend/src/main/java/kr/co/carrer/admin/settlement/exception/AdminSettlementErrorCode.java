package kr.co.carrer.admin.settlement.exception;

import kr.co.carrer.global.exception.BaseErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdminSettlementErrorCode implements BaseErrorCode {

    SETTLEMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 정산 리포트입니다."),
    DUPLICATE_PERIOD(HttpStatus.CONFLICT, "동일 기간에 확정된 정산 리포트가 존재합니다."),
    INVALID_PERIOD(HttpStatus.BAD_REQUEST, "정산 시작일은 종료일보다 이전이어야 합니다."),
    ALREADY_CONFIRMED(HttpStatus.CONFLICT, "이미 확정된 정산 리포트입니다.");

    private final HttpStatus status;
    private final String message;
}
