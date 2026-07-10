package kr.co.carrer.user.billing.service;

import java.util.UUID;

public interface EntitlementInitService {

    /**
     * 일반/소셜 USER 회원 가입 완료 직후 호출.
     * document-coaching, interview 상품별 FREE 이용권 1개씩 생성한다.
     * 이미 존재하는 상품은 건너뛰어 중복 생성을 방지한다.
     */
    void initFreeEntitlements(UUID memberId);

    /**
     * 단일 상품의 FREE 이용권이 없으면 생성한다. (결산 등에서 이용권 부재로 발급이 막히지 않도록 방어)
     * 동시 호출 경합은 REQUIRES_NEW + 유니크 제약 충돌 무시로 멱등 처리한다.
     */
    void ensureFreeEntitlement(UUID memberId, String productCode);
}
