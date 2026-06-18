package kr.co.carrer.user.member.service;

public interface EmailSenderPort {

    void sendVerificationCode(String toEmail, String code);
}
