package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.FaqDTO;
import kr.co.carrer.admin.cs.entity.Faq;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.repository.FaqRepository;
import kr.co.carrer.admin.cs.type.FaqCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;

import java.lang.reflect.Field;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminFaqServiceImplTest {

    @InjectMocks
    private AdminFaqServiceImpl adminFaqService;

    @Mock private FaqRepository faqRepository;

    private EntityManager em;

    @BeforeEach
    void setUp() throws Exception {
        em = mock(EntityManager.class);
        Field emField = AdminFaqServiceImpl.class.getDeclaredField("em");
        emField.setAccessible(true);
        emField.set(adminFaqService, em);
    }

    @Nested
    @DisplayName("FAQ 등록 - createFaq()")
    class CreateFaq {

        @Test
        @DisplayName("FAQ 등록 성공 - save 호출 및 ResponseResult 반환")
        void create_success() {
            FaqDTO.RequestCreate dto = new FaqDTO.RequestCreate(
                FaqCategory.ACCOUNT, "비밀번호를 잊었어요", "비밀번호 찾기 메뉴를 이용하세요."
            );
            given(faqRepository.save(any())).willAnswer(i -> i.getArgument(0));

            FaqDTO.ResponseResult result = adminFaqService.createFaq(dto, 1L);

            verify(faqRepository).save(any(Faq.class));
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("FAQ 수정 - updateFaq()")
    class UpdateFaq {

        @Test
        @DisplayName("FAQ 수정 성공")
        void update_success() {
            Faq faq = createFaq(1L);
            given(faqRepository.findById(1L)).willReturn(Optional.of(faq));

            FaqDTO.RequestUpdate dto = new FaqDTO.RequestUpdate(
                FaqCategory.PAYMENT, "결제 수단 변경 방법", "마이페이지에서 변경 가능합니다."
            );

            FaqDTO.ResponseResult result = adminFaqService.updateFaq(1L, dto);

            assertThat(faq.getCategory()).isEqualTo(FaqCategory.PAYMENT);
            assertThat(faq.getQuestion()).isEqualTo("결제 수단 변경 방법");
            assertThat(result.faqId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("존재하지 않는 FAQ 수정 시 FAQ_NOT_FOUND 예외")
        void notFound_throws() {
            given(faqRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminFaqService.updateFaq(99L,
                new FaqDTO.RequestUpdate(FaqCategory.ACCOUNT, "질문", "답변")))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.FAQ_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("FAQ 삭제 - deleteFaq()")
    class DeleteFaq {

        @Test
        @DisplayName("FAQ 삭제 성공")
        void delete_success() {
            Faq faq = createFaq(1L);
            given(faqRepository.findById(1L)).willReturn(Optional.of(faq));

            adminFaqService.deleteFaq(1L);

            verify(faqRepository).delete(faq);
        }

        @Test
        @DisplayName("존재하지 않는 FAQ 삭제 시 FAQ_NOT_FOUND 예외")
        void notFound_throws() {
            given(faqRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminFaqService.deleteFaq(99L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.FAQ_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("FAQ 목록 조회 - getFaqs() 유효성")
    class GetFaqsValidation {

        @Test
        @DisplayName("page < 1 이면 BAD_REQUEST 예외")
        void invalidPage_throws() {
            assertThatThrownBy(() -> adminFaqService.getFaqs(null, 0, 20))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.BAD_REQUEST);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private Faq createFaq(Long faqId) {
        Faq faq = Faq.create(1L, FaqCategory.ACCOUNT, "질문입니다", "답변입니다");
        try {
            var field = Faq.class.getDeclaredField("faqId");
            field.setAccessible(true);
            field.set(faq, faqId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return faq;
    }
}
