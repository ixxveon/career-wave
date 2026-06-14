package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.InquiryDTO;
import kr.co.carrer.admin.cs.entity.Inquiry;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.repository.InquiryQueryRepository;
import kr.co.carrer.admin.cs.repository.InquiryRepository;
import kr.co.carrer.admin.cs.type.InquiryCategory;
import kr.co.carrer.admin.cs.type.InquiryStatus;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class AdminInquiryServiceImplTest {

    @InjectMocks
    private AdminInquiryServiceImpl adminInquiryService;

    @Mock private InquiryRepository inquiryRepository;
    @Mock private InquiryQueryRepository inquiryQueryRepository;

    @Nested
    @DisplayName("문의 목록 조회 - getInquiries() 유효성")
    class GetInquiriesValidation {

        @Test
        @DisplayName("page < 1 이면 BAD_REQUEST 예외")
        void invalidPage_throws() {
            assertThatThrownBy(() -> adminInquiryService.getInquiries(null, null, 0, 20))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.BAD_REQUEST);
        }
    }

    @Nested
    @DisplayName("문의 상세 조회 - getInquiryDetail()")
    class GetInquiryDetail {

        @Test
        @DisplayName("존재하지 않는 문의 조회 시 INQUIRY_NOT_FOUND 예외")
        void notFound_throws() {
            given(inquiryQueryRepository.findDetail(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminInquiryService.getInquiryDetail(99L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.INQUIRY_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("답변 저장 - saveReply()")
    class SaveReply {

        @Test
        @DisplayName("PENDING 문의에 답변 저장 성공 - 상태가 IN_PROGRESS로 변경")
        void reply_pending_success() {
            Inquiry inquiry = createInquiry(1L, InquiryStatus.PENDING);
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));

            InquiryDTO.ResponseReply result = adminInquiryService.saveReply(1L, "답변 내용입니다.", 99L);

            assertThat(inquiry.getInquiryStatus()).isEqualTo(InquiryStatus.IN_PROGRESS);
            assertThat(inquiry.getReply()).isEqualTo("답변 내용입니다.");
            assertThat(inquiry.getRepliedAt()).isNotNull();
            assertThat(result.inquiryStatus()).isEqualTo(InquiryStatus.IN_PROGRESS);
        }

        @Test
        @DisplayName("IN_PROGRESS 문의에 답변 재저장 성공 - repliedAt 변경 없음")
        void reply_inProgress_success() {
            Inquiry inquiry = createInquiry(2L, InquiryStatus.IN_PROGRESS);
            inquiry.saveReply("첫 답변", 1L);
            var firstRepliedAt = inquiry.getRepliedAt();
            given(inquiryRepository.findById(2L)).willReturn(Optional.of(inquiry));

            adminInquiryService.saveReply(2L, "수정된 답변", 99L);

            assertThat(inquiry.getRepliedAt()).isEqualTo(firstRepliedAt);
        }

        @Test
        @DisplayName("COMPLETED 문의에 답변 저장 시 INQUIRY_ALREADY_COMPLETED 예외")
        void reply_completed_throws() {
            Inquiry inquiry = createInquiry(3L, InquiryStatus.COMPLETED);
            given(inquiryRepository.findById(3L)).willReturn(Optional.of(inquiry));

            assertThatThrownBy(() -> adminInquiryService.saveReply(3L, "답변", 99L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.INQUIRY_ALREADY_COMPLETED);
        }

        @Test
        @DisplayName("존재하지 않는 문의 답변 시 INQUIRY_NOT_FOUND 예외")
        void notFound_throws() {
            given(inquiryRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminInquiryService.saveReply(99L, "답변", 1L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.INQUIRY_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("처리 완료 - completeInquiry()")
    class CompleteInquiry {

        @Test
        @DisplayName("IN_PROGRESS 문의 완료 처리 성공")
        void complete_success() {
            Inquiry inquiry = createInquiry(1L, InquiryStatus.IN_PROGRESS);
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            given(inquiryRepository.saveAndFlush(any())).willReturn(inquiry);

            InquiryDTO.ResponseComplete result = adminInquiryService.completeInquiry(1L);

            assertThat(inquiry.getInquiryStatus()).isEqualTo(InquiryStatus.COMPLETED);
            assertThat(inquiry.getCompletedAt()).isNotNull();
            assertThat(result.inquiryStatus()).isEqualTo(InquiryStatus.COMPLETED);
        }

        @Test
        @DisplayName("PENDING 문의 완료 처리 시 INQUIRY_NOT_IN_PROGRESS 예외")
        void complete_pending_throws() {
            Inquiry inquiry = createInquiry(2L, InquiryStatus.PENDING);
            given(inquiryRepository.findById(2L)).willReturn(Optional.of(inquiry));

            assertThatThrownBy(() -> adminInquiryService.completeInquiry(2L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.INQUIRY_NOT_IN_PROGRESS);
        }

        @Test
        @DisplayName("COMPLETED 문의 완료 재처리 시 INQUIRY_NOT_IN_PROGRESS 예외")
        void complete_alreadyCompleted_throws() {
            Inquiry inquiry = createInquiry(3L, InquiryStatus.COMPLETED);
            given(inquiryRepository.findById(3L)).willReturn(Optional.of(inquiry));

            assertThatThrownBy(() -> adminInquiryService.completeInquiry(3L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.INQUIRY_NOT_IN_PROGRESS);
        }

        @Test
        @DisplayName("존재하지 않는 문의 완료 처리 시 INQUIRY_NOT_FOUND 예외")
        void notFound_throws() {
            given(inquiryRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminInquiryService.completeInquiry(99L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.INQUIRY_NOT_FOUND);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private Inquiry createInquiry(Long inquiryId, InquiryStatus status) {
        try {
            var constructor = Inquiry.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Inquiry inquiry = constructor.newInstance();

            setField(inquiry, "inquiryId", inquiryId);
            setField(inquiry, "memberId", UUID.randomUUID());
            setField(inquiry, "category", InquiryCategory.SERVICE);
            setField(inquiry, "title", "문의 제목");
            setField(inquiry, "content", "문의 내용");
            setField(inquiry, "inquiryStatus", status);
            setField(inquiry, "version", 0L);
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
