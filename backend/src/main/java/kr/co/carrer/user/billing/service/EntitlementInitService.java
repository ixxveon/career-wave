package kr.co.carrer.user.billing.service;

import java.util.UUID;

public interface EntitlementInitService {

    /**
     * 일반/소셜 USER 회원 가입 완료 직후 호출.
     * document-coaching, interview 상품별 FREE 이용권 1개씩 생성한다.
     * 이미 존재하는 상품은 건너뛰어 중복 생성을 방지한다.
     */
    void initFreeEntitlements(UUID memberId);
}
