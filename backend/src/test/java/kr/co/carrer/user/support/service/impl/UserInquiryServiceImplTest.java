package kr.co.carrer.user.support.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.support.dto.SupportDTO;
import kr.co.carrer.user.support.entity.SupportInquiry;
import kr.co.carrer.user.support.exception.UserSupportErrorCode;
import kr.co.carrer.user.support.repository.UserInquiryRepository;
import kr.co.carrer.user.support.type.InquiryCategory;
import kr.co.carrer.user.support.type.InquiryStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class UserInquiryServiceImplTest {

    @InjectMocks
    private UserInquiryServiceImpl userInquiryService;

    @Mock
    private UserInquiryRepository inquiryRepository;

    @Nested
    @DisplayName("문의 목록 조회 - getMyInquiries()")
    class GetMyInquiries {

        @Test
        @DisplayName("본인 문의 목록 조회 성공")
        void getMyInquiries_success() {
            UUID memberId = UUID.randomUUID();
            SupportInquiry inquiry = createInquiry(1L, memberId, InquiryCategory.SERVICE, "제목", "내용입니다열자이상", InquiryStatus.PENDING);
            given(inquiryRepository.findByMemberIdAndCategory(memberId, null))
                .willReturn(List.of(inquiry));

            List<SupportDTO.InquiryList> result = userInquiryService.getMyInquiries(memberId, null);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).inquiryId()).isEqualTo(1L);
            assertThat(result.get(0).category()).isEqualTo(InquiryCategory.SERVICE);
            assertThat(result.get(0).title()).isEqualTo("제목");
            assertThat(result.get(0).inquiryStatus()).isEqualTo(InquiryStatus.PENDING);
        }

        @Test
        @DisplayName("content가 100자를 초과하면 100자로 잘린다")
        void getMyInquiries_contentTruncatedAt100() {
            UUID memberId = UUID.randomUUID();
            String longContent = "a".repeat(150);
            SupportInquiry inquiry = createInquiry(1L, memberId, InquiryCategory.SERVICE, "제목", longContent, InquiryStatus.PENDING);
            given(inquiryRepository.findByMemberIdAndCategory(memberId, null))
                .willReturn(List.of(inquiry));

            List<SupportDTO.InquiryList> result = userInquiryService.getMyInquiries(memberId, null);

            assertThat(result.get(0).contentPreview()).hasSize(100);
        }
    }

    @Nested
    @DisplayName("문의 접수 - createInquiry()")
    class CreateInquiry {

        @Test
        @DisplayName("문의 접수 성공")
        void createInquiry_success() {
            UUID memberId = UUID.randomUUID();
            SupportDTO.RequestCreateInquiry dto = new SupportDTO.RequestCreateInquiry(
                InquiryCategory.SERVICE, "문의 제목", "열 자 이상의 문의 내용입니다"
            );
            SupportInquiry saved = createInquiry(1L, memberId, InquiryCategory.SERVICE, "문의 제목", "열 자 이상의 문의 내용입니다", InquiryStatus.PENDING);
            given(inquiryRepository.save(any(SupportInquiry.class))).willReturn(saved);

            SupportDTO.ResponseCreateInquiry response = userInquiryService.createInquiry(memberId, dto);

            assertThat(response.inquiryId()).isEqualTo(1L);
            assertThat(response.inquiryStatus()).isEqualTo(InquiryStatus.PENDING);
        }

        @Test
        @DisplayName("정확히 10자이면 접수에 성공한다")
        void createInquiry_exactlyTenCharsSuccess() {
            UUID memberId = UUID.randomUUID();
            String tenChars = "1234567890";
            SupportDTO.RequestCreateInquiry dto = new SupportDTO.RequestCreateInquiry(
                InquiryCategory.SERVICE, "제목", tenChars
            );
            SupportInquiry saved = createInquiry(2L, memberId, InquiryCategory.SERVICE, "제목", tenChars, InquiryStatus.PENDING);
            given(inquiryRepository.save(any(SupportInquiry.class))).willReturn(saved);

            SupportDTO.ResponseCreateInquiry response = userInquiryService.createInquiry(memberId, dto);

            assertThat(response.inquiryId()).isEqualTo(2L);
            assertThat(response.inquiryStatus()).isEqualTo(InquiryStatus.PENDING);
        }

        @Test
        @DisplayName("내용이 9자이면 INVALID_INQUIRY_CONTENT 예외")
        void createInquiry_contentTooShortThrows() {
            UUID memberId = UUID.randomUUID();
            SupportDTO.RequestCreateInquiry dto = new SupportDTO.RequestCreateInquiry(
                InquiryCategory.SERVICE, "제목", "123456789"
            );

            assertThatThrownBy(() -> userInquiryService.createInquiry(memberId, dto))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(UserSupportErrorCode.INVALID_INQUIRY_CONTENT);
        }
    }

    private SupportInquiry createInquiry(Long id, UUID memberId, InquiryCategory category,
                                          String title, String content, InquiryStatus status) {
        try {
            var constructor = SupportInquiry.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            SupportInquiry inquiry = constructor.newInstance();
            setField(inquiry, "inquiryId", id);
            setField(inquiry, "memberId", memberId);
            setField(inquiry, "category", category);
            setField(inquiry, "title", title);
            setField(inquiry, "content", content);
            setField(inquiry, "reply", null);
            setField(inquiry, "inquiryStatus", status);
            setField(inquiry, "createdAt", ZonedDateTime.now(ZoneId.of("Asia/Seoul")));
            setField(inquiry, "updatedAt", ZonedDateTime.now(ZoneId.of("Asia/Seoul")));
            return inquiry;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        var field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
