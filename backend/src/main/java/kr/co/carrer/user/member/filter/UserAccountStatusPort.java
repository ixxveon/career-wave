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
import org.springframework.transaction.annotation.Transactional;

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
    @Transactional
    public void validateActive(String subjectId) {
        UUID id;
        try {
            id = UUID.fromString(subjectId);
        } catch (IllegalArgumentException e) {
            throw new CustomException(AuthErrorCode.AUTH_UNAUTHENTICATED);
        }
        Member member = memberRepository.findById(id)
                .orElseThrow(() -> new CustomException(AuthErrorCode.AUTH_UNAUTHENTICATED));

        switch (member.getMemberStatus()) {
            case SUSPENDED -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_SUSPENDED);
            case BANNED    -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_BANNED);
            case WITHDRAWN -> throw new CustomException(UserAuthErrorCode.AUTH_ACCOUNT_WITHDRAWN);
            case LOCKED -> {
                if (member.getLockedUntil() != null && Instant.now().isBefore(member.getLockedUntil())) {
                    throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
                }
                // 잠금 만료 시 로그인 경로와 동일하게 ACTIVE로 복구 (DB 정합성 유지)
                member.recoverFromLock();
            }
            default -> {}
        }
    }
}
