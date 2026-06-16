package kr.co.carrer.admin.cs.service.impl;

import kr.co.carrer.admin.cs.dto.NoticeDTO;
import kr.co.carrer.admin.cs.entity.Notice;
import kr.co.carrer.admin.cs.exception.AdminCsErrorCode;
import kr.co.carrer.admin.cs.repository.NoticeQueryRepository;
import kr.co.carrer.admin.cs.repository.NoticeRepository;
import kr.co.carrer.admin.cs.type.NoticeCategory;
import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.exception.ErrorCode;
import kr.co.carrer.global.response.PaginationResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminNoticeServiceImplTest {

    @InjectMocks
    private AdminNoticeServiceImpl adminNoticeService;

    @Mock private NoticeRepository noticeRepository;
    @Mock private NoticeQueryRepository noticeQueryRepository;

    @Nested
    @DisplayName("공지사항 목록 조회 - getNotices()")
    class GetNotices {

        @Test
        @DisplayName("필터 없이 목록 조회 성공")
        void getNotices_success() {
            List<NoticeDTO.ResponseList> items = List.of(
                new NoticeDTO.ResponseList(1L, NoticeCategory.NOTICE, "제목", true, ZonedDateTime.now())
            );
            given(noticeQueryRepository.findNotices(null, null, null, 0, 20)).willReturn(items);
            given(noticeQueryRepository.countNotices(null, null, null)).willReturn(1L);

            PaginationResponse<NoticeDTO.ResponseList> result = adminNoticeService.getNotices(null, null, null, 1, 20);

            assertThat(result.items()).hasSize(1);
            assertThat(result.totalItems()).isEqualTo(1L);
        }

        @Test
        @DisplayName("page < 1 이면 BAD_REQUEST 예외")
        void invalidPage_throws() {
            assertThatThrownBy(() -> adminNoticeService.getNotices(null, null, null, 0, 20))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.BAD_REQUEST);
        }

        @Test
        @DisplayName("size > 100 이면 100으로 clamp")
        void sizeClamp() {
            given(noticeQueryRepository.findNotices(null, null, null, 0, 100)).willReturn(List.of());
            given(noticeQueryRepository.countNotices(null, null, null)).willReturn(0L);

            adminNoticeService.getNotices(null, null, null, 1, 999);

            verify(noticeQueryRepository).findNotices(null, null, null, 0, 100);
        }
    }

    @Nested
    @DisplayName("공지사항 상세 조회 - getNoticeDetail()")
    class GetNoticeDetail {

        @Test
        @DisplayName("존재하는 공지사항 상세 조회 성공")
        void getDetail_success() {
            NoticeDTO.ResponseDetail detail = new NoticeDTO.ResponseDetail(
                1L, NoticeCategory.NOTICE, "제목", "내용", true, ZonedDateTime.now(), null
            );
            given(noticeQueryRepository.findDetail(1L)).willReturn(Optional.of(detail));

            NoticeDTO.ResponseDetail result = adminNoticeService.getNoticeDetail(1L);

            assertThat(result.noticeId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("존재하지 않는 공지사항 조회 시 NOTICE_NOT_FOUND 예외")
        void notFound_throws() {
            given(noticeQueryRepository.findDetail(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminNoticeService.getNoticeDetail(99L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.NOTICE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("공지사항 등록 - createNotice()")
    class CreateNotice {

        @Test
        @DisplayName("공지사항 등록 성공 - save 호출 및 ResponseResult 반환")
        void create_success() {
            NoticeDTO.RequestCreate dto = new NoticeDTO.RequestCreate(
                NoticeCategory.NOTICE, "제목입니다", "내용입니다", true
            );
            given(noticeRepository.save(any())).willAnswer(i -> i.getArgument(0));

            NoticeDTO.ResponseResult result = adminNoticeService.createNotice(dto, 1L);

            verify(noticeRepository).save(any(Notice.class));
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("공지사항 수정 - updateNotice()")
    class UpdateNotice {

        @Test
        @DisplayName("공지사항 수정 성공")
        void update_success() {
            Notice notice = createNotice(1L);
            given(noticeRepository.findById(1L)).willReturn(Optional.of(notice));

            NoticeDTO.RequestUpdate dto = new NoticeDTO.RequestUpdate(
                NoticeCategory.UPDATE, "수정된 제목", "수정된 내용", false
            );

            NoticeDTO.ResponseResult result = adminNoticeService.updateNotice(1L, dto);

            assertThat(notice.getCategory()).isEqualTo(NoticeCategory.UPDATE);
            assertThat(notice.getTitle()).isEqualTo("수정된 제목");
            assertThat(result.noticeId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("존재하지 않는 공지사항 수정 시 NOTICE_NOT_FOUND 예외")
        void notFound_throws() {
            given(noticeRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminNoticeService.updateNotice(99L,
                new NoticeDTO.RequestUpdate(NoticeCategory.NOTICE, "제목", "내용", true)))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.NOTICE_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("공지사항 삭제 - deleteNotice()")
    class DeleteNotice {

        @Test
        @DisplayName("공지사항 삭제 성공")
        void delete_success() {
            Notice notice = createNotice(1L);
            given(noticeRepository.findById(1L)).willReturn(Optional.of(notice));

            adminNoticeService.deleteNotice(1L);

            verify(noticeRepository).delete(notice);
        }

        @Test
        @DisplayName("존재하지 않는 공지사항 삭제 시 NOTICE_NOT_FOUND 예외")
        void notFound_throws() {
            given(noticeRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminNoticeService.deleteNotice(99L))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(AdminCsErrorCode.NOTICE_NOT_FOUND);
        }
    }

    // ── 헬퍼 ──────────────────────────────────────────────────────────────────

    private Notice createNotice(Long noticeId) {
        Notice notice = Notice.create(1L, NoticeCategory.NOTICE, "제목", "내용", true);
        try {
            var field = Notice.class.getDeclaredField("noticeId");
            field.setAccessible(true);
            field.set(notice, noticeId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return notice;
    }
}
