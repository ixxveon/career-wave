package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.CareerHistory;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class InterviewHistoryServiceImplTest {

    @InjectMocks
    private InterviewHistoryServiceImpl interviewHistoryService;

    @Mock private CareerHistoryRepository careerHistoryRepository;
    @Mock private InterviewSessionRepository sessionRepository;

    @Nested
    @DisplayName("면접 이력 조회 - getHistory()")
    class GetHistory {

        @Test
        @DisplayName("본인 이력만 반환되며 PaginationResponse 형식이다")
        void getHistory_returnsPaginatedItems() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();

            CareerHistory history = CareerHistory.create(memberId, sessionId, null, 85, null);
            InterviewSession session = mock(InterviewSession.class);
            given(session.getSessionId()).willReturn(sessionId);
            given(session.getSessionType()).willReturn(SessionType.TEXT);
            given(session.getInterviewType()).willReturn(null);
            given(session.getTargetCompany()).willReturn(null);
            given(session.getSessionStatus()).willReturn(SessionStatus.COMPLETED);

            given(careerHistoryRepository.findByMemberIdOrderByCreatedAtDesc(any(), any()))
                    .willReturn(new PageImpl<>(List.of(history), PageRequest.of(0, 10), 1));
            given(sessionRepository.findAllBySessionIdIn(anyList()))
                    .willReturn(List.of(session));

            PaginationResponse<InterviewDTO.HistoryItem> result =
                    interviewHistoryService.getHistory(memberId, 0, 10);

            assertThat(result.items()).hasSize(1);
            assertThat(result.totalItems()).isEqualTo(1);
            assertThat(result.items().get(0).sessionType()).isEqualTo(SessionType.TEXT.name());
            assertThat(result.items().get(0).totalScore()).isEqualTo(85);
        }

        @Test
        @DisplayName("이력이 없으면 빈 목록을 반환한다")
        void getHistory_noHistory_returnsEmpty() {
            UUID memberId = UUID.randomUUID();

            given(careerHistoryRepository.findByMemberIdOrderByCreatedAtDesc(any(), any()))
                    .willReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
            given(sessionRepository.findAllBySessionIdIn(List.of()))
                    .willReturn(List.of());

            PaginationResponse<InterviewDTO.HistoryItem> result =
                    interviewHistoryService.getHistory(memberId, 0, 10);

            assertThat(result.items()).isEmpty();
            assertThat(result.totalItems()).isZero();
        }

        @Test
        @DisplayName("세션이 삭제된 이력은 sessionType이 null로 반환된다")
        void getHistory_orphanedHistory_returnsNullSessionFields() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();

            CareerHistory history = CareerHistory.create(memberId, sessionId, null, null, null);

            given(careerHistoryRepository.findByMemberIdOrderByCreatedAtDesc(any(), any()))
                    .willReturn(new PageImpl<>(List.of(history), PageRequest.of(0, 10), 1));
            given(sessionRepository.findAllBySessionIdIn(List.of(sessionId)))
                    .willReturn(List.of());

            PaginationResponse<InterviewDTO.HistoryItem> result =
                    interviewHistoryService.getHistory(memberId, 0, 10);

            assertThat(result.items().get(0).sessionType()).isNull();
            assertThat(result.items().get(0).sessionStatus()).isNull();
        }
    }
}
