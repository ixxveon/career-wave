package kr.co.carrer.user.member.filter;

import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.exception.UserAuthErrorCode;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import kr.co.carrer.user.member.type.MemberStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserAccountStatusPort implements AccountStatusPort {

    private final UserMemberRepository memberRepository;

    @Override
    public boolean supports(AccountType accountType) {
        return accountType == AccountType.USER || accountType == AccountType.COMPANY;
    }

    @Override
    public void validateActive(String subjectId) {
        Member member = memberRepository.findById(UUID.fromString(subjectId)).orElse(null);
        if (member == null) return;

        switch (member.getMemberStatus()) {
            case SUSPENDED -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
            case BANNED    -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
            case WITHDRAWN -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
            case LOCKED -> {
                if (member.getLockedUntil() != null && Instant.now().isBefore(member.getLockedUntil())) {
                    throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
                }
            }
            default -> {}
        }
    }
}
