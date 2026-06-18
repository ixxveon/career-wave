package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserRecoveryDto;

public interface UserRecoveryService {

    UserRecoveryDto.ResponseFindId findId(UserRecoveryDto.RequestFindId request);

    /**
     * @param clientIp Controller에서 HttpServletRequest.getRemoteAddr()로 추출해 전달.
     *                 loginId+IP 기준 10분 5회 rate limit 적용 (spec §10).
     */
    UserRecoveryDto.ResponsePasswordToken issuePasswordToken(
            UserRecoveryDto.RequestPasswordToken request, String clientIp);

    UserRecoveryDto.ResponseResetPassword resetPassword(UserRecoveryDto.RequestResetPassword request);
}
