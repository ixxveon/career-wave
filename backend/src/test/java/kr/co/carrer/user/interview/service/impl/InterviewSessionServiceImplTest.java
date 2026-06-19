package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.interview.client.InterviewFastApiClient;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.InterviewMessage;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;
import kr.co.carrer.user.resume.repository.DocumentRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewSessionServiceImplTest {

    @InjectMocks
    private InterviewSessionServiceImpl interviewSessionService;

    @Mock private InterviewSessionRepository sessionRepository;
    @Mock private InterviewMessageRepository messageRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private InterviewFastApiClient fastApiClient;

    @Nested
    @DisplayName("세션 시작 - startSession()")
    class StartSession {

        @Test
        @DisplayName("유효한 요청 시 세션이 생성되고 ResponseStartSession을 반환한다")
        void startSession_success() {
            UUID memberId = UUID.randomUUID();
            InterviewDTO.RequestStartSession dto = new InterviewDTO.RequestStartSession(
                    null, "TEXT", "TECHNICAL", "카카오"
            );
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.TEXT, InterviewType.TECHNICAL, "카카오");

            given(sessionRepository.findInProgressByMemberId(memberId, SessionStatus.IN_PROGRESS)).willReturn(Optional.empty());
            given(sessionRepository.save(any())).willReturn(session);

            InterviewDTO.ResponseStartSession result = interviewSessionService.startSession(memberId, dto);

            assertThat(result.sessionStatus()).isEqualTo("IN_PROGRESS");
            assertThat(result.sessionType()).isEqualTo("TEXT");
            verify(sessionRepository).save(any());
        }

        @Test
        @DisplayName("이미 IN_PROGRESS 세션이 있으면 INTERVIEW_SESSION_DUPLICATE(409)를 던진다")
        void startSession_duplicateSession_throwsException() {
            UUID memberId = UUID.randomUUID();
            InterviewDTO.RequestStartSession dto = new InterviewDTO.RequestStartSession(
                    null, "TEXT", null, null
            );
            InterviewSession existing = InterviewSession.create(memberId, null, SessionType.TEXT, null, null);

            given(sessionRepository.findInProgressByMemberId(memberId, SessionStatus.IN_PROGRESS)).willReturn(Optional.of(existing));

            assertThatThrownBy(() -> interviewSessionService.startSession(memberId, dto))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_DUPLICATE));
        }

        @Test
        @DisplayName("유효하지 않은 sessionType이면 INTERVIEW_INVALID_SESSION_TYPE(400)을 던진다")
        void startSession_invalidSessionType_throwsException() {
            UUID memberId = UUID.randomUUID();
            InterviewDTO.RequestStartSession dto = new InterviewDTO.RequestStartSession(
                    null, "INVALID_TYPE", null, null
            );

            assertThatThrownBy(() -> interviewSessionService.startSession(memberId, dto))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_INVALID_SESSION_TYPE));
        }
    }

    @Nested
    @DisplayName("텍스트 답변 제출 - submitTextAnswer()")
    class SubmitTextAnswer {

        @Test
        @DisplayName("정상 요청 시 메시지를 저장하고 ResponseSubmitTextAnswer를 반환한다")
        void submitTextAnswer_success() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewDTO.RequestSubmitTextAnswer dto = new InterviewDTO.RequestSubmitTextAnswer(1, "답변 내용입니다.");
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.TEXT, null, null);
            InterviewMessage message = InterviewMessage.createAnswer(sessionId, "답변 내용입니다.");

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.of(session));
            given(messageRepository.save(any())).willReturn(message);

            InterviewDTO.ResponseSubmitTextAnswer result = interviewSessionService.submitTextAnswer(memberId, sessionId, dto);

            assertThat(result).isNotNull();
            verify(messageRepository).save(any());
        }

        @Test
        @DisplayName("존재하지 않는 세션 ID면 INTERVIEW_SESSION_NOT_FOUND(404)을 던진다")
        void submitTextAnswer_notFound_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewDTO.RequestSubmitTextAnswer dto = new InterviewDTO.RequestSubmitTextAnswer(1, "답변");

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> interviewSessionService.submitTextAnswer(memberId, sessionId, dto))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_NOT_FOUND));
        }

        @Test
        @DisplayName("타인 세션에 접근하면 INTERVIEW_SESSION_FORBIDDEN(403)을 던진다")
        void submitTextAnswer_forbidden_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID otherMemberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewDTO.RequestSubmitTextAnswer dto = new InterviewDTO.RequestSubmitTextAnswer(1, "답변");
            InterviewSession session = InterviewSession.create(otherMemberId, null, SessionType.TEXT, null, null);

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.of(session));

            assertThatThrownBy(() -> interviewSessionService.submitTextAnswer(memberId, sessionId, dto))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));
        }

        @Test
        @DisplayName("종료된 세션에 답변 제출 시 INTERVIEW_SESSION_ALREADY_ENDED(400)을 던진다")
        void submitTextAnswer_alreadyEnded_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewDTO.RequestSubmitTextAnswer dto = new InterviewDTO.RequestSubmitTextAnswer(1, "답변");
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.TEXT, null, null);
            session.complete(java.time.ZonedDateTime.now());

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.of(session));

            assertThatThrownBy(() -> interviewSessionService.submitTextAnswer(memberId, sessionId, dto))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED));
        }
    }

    @Nested
    @DisplayName("세션 종료 - endSession()")
    class EndSession {

        @Test
        @DisplayName("정상 요청 시 세션이 COMPLETED로 변경되고 ResponseEndSession을 반환한다")
        void endSession_success() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.TEXT, null, null);

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.of(session));

            InterviewDTO.ResponseEndSession result = interviewSessionService.endSession(memberId, sessionId);

            assertThat(result.sessionStatus()).isEqualTo("COMPLETED");
            assertThat(result.endedAt()).isNotNull();
        }

        @Test
        @DisplayName("존재하지 않는 세션 ID면 INTERVIEW_SESSION_NOT_FOUND(404)을 던진다")
        void endSession_notFound_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> interviewSessionService.endSession(memberId, sessionId))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_NOT_FOUND));
        }

        @Test
        @DisplayName("이미 COMPLETED 세션 재종료 시 INTERVIEW_SESSION_ALREADY_ENDED(400)을 던진다")
        void endSession_alreadyCompleted_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.TEXT, null, null);
            session.complete(java.time.ZonedDateTime.now());

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.of(session));

            assertThatThrownBy(() -> interviewSessionService.endSession(memberId, sessionId))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED));

            verify(fastApiClient, never()).triggerReportGeneration(any(), any(), any());
        }

        @Test
        @DisplayName("타인 세션 종료 시도 시 INTERVIEW_SESSION_FORBIDDEN(403)을 던진다")
        void endSession_forbidden_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID otherMemberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(otherMemberId, null, SessionType.TEXT, null, null);

            given(sessionRepository.findBySessionId(sessionId)).willReturn(Optional.of(session));

            assertThatThrownBy(() -> interviewSessionService.endSession(memberId, sessionId))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));
        }
    }
}
