package kr.co.carrer.user.member.service.impl;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.member.dto.UserVerificationDto;
import kr.co.carrer.user.member.entity.MemberVerification;
import kr.co.carrer.user.member.repository.MemberVerificationRepository;
import kr.co.carrer.user.member.service.EmailSenderPort;
import kr.co.carrer.user.member.service.SmsSenderPort;
import kr.co.carrer.user.member.type.VerificationChannel;
import kr.co.carrer.user.member.type.VerificationPurpose;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * @Transactional(noRollbackFor = CustomException.class) 적용 후
 * 실제 DB에 감소 횟수가 커밋되는지 검증하는 JPA 슬라이스 통합 테스트.
 *
 * 주의: 테스트 클래스에 @Transactional을 붙이지 않음.
 * 붙이면 service 트랜잭션이 테스트 트랜잭션에 참여하여 noRollbackFor 동작을 검증할 수 없음.
 */
@DataJpaTest
@Import(UserVerificationServiceImpl.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@TestPropertySource(properties = {
        "spring.sql.init.mode=never",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserVerificationTransactionIT {

    @Autowired MemberVerificationRepository verificationRepository;
    @Autowired UserVerificationServiceImpl service;
    @PersistenceContext EntityManager entityManager;
    @MockBean EmailSenderPort emailSenderPort;
    @MockBean SmsSenderPort smsSenderPort;

    @AfterEach
    void cleanUp() {
        verificationRepository.deleteAll();
    }

    @Test
    void confirm_코드불일치_noRollbackFor_감소_DB_커밋_검증() throws Exception {
        // 1. Arrange: H2에 verification 저장 (remainingAttempts 기본값 = 5)
        MemberVerification v = MemberVerification.issue(
                VerificationChannel.EMAIL, "test@example.com",
                VerificationPurpose.REGISTER,
                "fixedhash-will-not-match-any-code",   // 어떤 6자리 숫자의 SHA-256과도 불일치
                Instant.now().plusSeconds(300),
                Instant.now().plusSeconds(60));
        verificationRepository.save(v);
        UUID id = v.getVerificationId();

        // 2. Act: 틀린 코드로 confirm 호출 → INVALID_VERIFICATION_CODE 발생
        UserVerificationDto.RequestConfirmVerification request =
                new UserVerificationDto.RequestConfirmVerification();
        setField(request, "verificationId", id);
        setField(request, "code", "000000");  // SHA-256("000000") != "fixedhash-..."

        try {
            service.confirm(request);
        } catch (CustomException ignored) {}

        // 3. 1차 캐시 제거 → DB 직접 조회
        entityManager.clear();
        MemberVerification reloaded = verificationRepository
                .findByVerificationId(id)
                .orElseThrow();

        // 4. Assert: noRollbackFor 덕분에 decrementAttempts()가 DB에 커밋됨 (5 → 4)
        assertThat(reloaded.getRemainingAttempts()).isEqualTo(4);
    }

    private void setField(Object target, String name, Object value) throws Exception {
        Class<?> clazz = target.getClass();
        while (clazz != null) {
            try {
                Field field = clazz.getDeclaredField(name);
                field.setAccessible(true);
                field.set(target, value);
                return;
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }
}
