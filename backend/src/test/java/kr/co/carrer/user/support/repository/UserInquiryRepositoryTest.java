package kr.co.carrer.user.support.repository;

import kr.co.carrer.support.PostgreSqlTestContainerSupport;
import kr.co.carrer.user.support.entity.SupportInquiry;
import kr.co.carrer.user.support.type.InquiryCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@TestPropertySource(properties = {"spring.sql.init.mode=never"})
class UserInquiryRepositoryTest extends PostgreSqlTestContainerSupport {

    @Autowired
    private UserInquiryRepository inquiryRepository;

    @Test
    @DisplayName("save() 후 원본 객체에도 inquiryId와 inquiryStatus가 주입되는지 확인")
    void save_shouldInjectIdAndStatusIntoOriginalEntity() {
        SupportInquiry inquiry = SupportInquiry.create(
                UUID.randomUUID(), InquiryCategory.SERVICE, "제목", "열 자 이상의 문의 내용입니다"
        );

        SupportInquiry saved = inquiryRepository.save(inquiry);

        // 핵심: 원본 객체에도 id가 주입됐는지 (IDENTITY 전략 동작 확인)
        assertThat(inquiry.getInquiryId()).isNotNull();
        assertThat(saved.getInquiryId()).isNotNull();
        assertThat(inquiry.getInquiryId()).isEqualTo(saved.getInquiryId());

        // @PrePersist: inquiryStatus가 원본 객체에도 세팅됐는지
        assertThat(inquiry.getInquiryStatus()).isNotNull();
        assertThat(saved.getInquiryStatus()).isEqualTo(inquiry.getInquiryStatus());
    }
}
