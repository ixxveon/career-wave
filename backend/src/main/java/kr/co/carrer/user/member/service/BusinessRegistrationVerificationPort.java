package kr.co.carrer.user.member.service;

public interface BusinessRegistrationVerificationPort {

    /**
     * 국세청 사업자등록정보 상태조회 API로 사업자번호 유효성을 검증한다.
     * 정상 사업자이면 true, 휴업·폐업·미등록이면 false.
     * 외부 API 장애·타임아웃 시 CustomException(COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE) throw.
     */
    boolean verify(String businessNumber);
}
