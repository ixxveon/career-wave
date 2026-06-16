package kr.co.carrer.auth.filter;

import kr.co.carrer.auth.jwt.AccountType;

/**
 * 계정 상태 검증 포트 — global/auth는 user/admin 도메인을 직접 참조하지 않으므로
 * 각 도메인에서 이 인터페이스를 구현해 filter에 주입한다.
 */
public interface AccountStatusPort {

    boolean supports(AccountType accountType);

    /** 현재 주체가 ACTIVE가 아니면 CustomException을 던진다. */
    void validateActive(String subjectId);
}
