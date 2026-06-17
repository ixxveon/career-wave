package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserRecoveryDto;

public interface UserRecoveryService {

    UserRecoveryDto.ResponseFindId findId(UserRecoveryDto.RequestFindId request);

    UserRecoveryDto.ResponsePasswordToken issuePasswordToken(UserRecoveryDto.RequestPasswordToken request);

    UserRecoveryDto.ResponseResetPassword resetPassword(UserRecoveryDto.RequestResetPassword request);
}
