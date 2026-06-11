package kr.co.carrer.admin.auth.filter;

import kr.co.carrer.admin.auth.entity.Admin;
import kr.co.carrer.admin.auth.repository.AdminRepository;
import kr.co.carrer.admin.auth.type.AdminStatus;
import kr.co.carrer.auth.exception.AuthErrorCode;
import kr.co.carrer.auth.filter.AccountStatusPort;
import kr.co.carrer.auth.jwt.AccountType;
import kr.co.carrer.global.exception.CustomException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminAccountStatusPort implements AccountStatusPort {

    private final AdminRepository adminRepository;

    @Override
    public boolean supports(AccountType accountType) {
        return accountType == AccountType.ADMIN;
    }

    @Override
    public void validateActive(String subjectId) {
        Admin admin = adminRepository.findById(Long.parseLong(subjectId)).orElse(null);
        if (admin == null) return;

        if (admin.getStatus() == AdminStatus.LOCKED) {
            throw new CustomException(AuthErrorCode.AUTH_ACCOUNT_LOCKED);
        }
    }
}
