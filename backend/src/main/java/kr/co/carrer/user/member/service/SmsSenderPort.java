package kr.co.carrer.user.member.service;

public interface SmsSenderPort {

    void sendVerificationCode(String toPhone, String code);
}
