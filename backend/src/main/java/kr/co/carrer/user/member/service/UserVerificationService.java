package kr.co.carrer.user.member.service;

import kr.co.carrer.user.member.dto.UserVerificationDto;

public interface UserVerificationService {

    UserVerificationDto.ResponseSendVerification send(UserVerificationDto.RequestSendVerification request);

    UserVerificationDto.ResponseConfirmVerification confirm(UserVerificationDto.RequestConfirmVerification request);
}
