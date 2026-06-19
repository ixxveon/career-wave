package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserRegisterDto;

public interface BusinessRegistrationVerificationPort {

    /**
     * 국세청 사업자등록정보 상태조회 API로 사업자번호 유효성을 검증한다.
     * 정상 사업자이면 true, 휴업·폐업·미등록이면 false.
     * 외부 API 장애·타임아웃 시 CustomException(COMPANY_BUSINESS_VERIFICATION_UNAVAILABLE) throw.
     */
    boolean verify(String businessNumber);

    /**
     * 사업자등록번호 상태를 상세 조회한다 — 사전 확인 전용 (기업 등록 전 빠른 피드백).
     * 최종 등록 시에는 verify()를 별도로 재검증한다.
     */
    UserRegisterDto.ResponseCheckBusinessNumber check(String businessNumber);
}
