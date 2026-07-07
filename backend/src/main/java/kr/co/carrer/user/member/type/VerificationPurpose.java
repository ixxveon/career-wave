package kr.co.carrer.user.member.type;

public enum VerificationPurpose {
    // SOCIAL_SIGNUP: 소셜 로그인 추가정보 단계 휴대폰 인증.
    // REGISTER와 달리 이미 가입된 휴대폰 번호도 허용한다(기존 회원 계정 연동을 위해).
    REGISTER, FIND_ID, RESET_PASSWORD, SOCIAL_SIGNUP
}
