package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.interview.client.InterviewFastApiClient;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.exception.InterviewErrorCode;
import kr.co.carrer.user.interview.repository.InterviewMessageRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.type.SessionType;
import kr.co.carrer.user.resume.repository.DocumentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InterviewSessionServiceVoiceTest {

    @InjectMocks
    private InterviewSessionServiceImpl interviewSessionService;

    @Mock private InterviewSessionRepository sessionRepository;
    @Mock private InterviewMessageRepository messageRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private InterviewFastApiClient fastApiClient;

    @Nested
    @DisplayName("음성 청크 제출 - submitVoiceChunk()")
    class SubmitVoiceChunk {

        @Test
        @DisplayName("유효한 audio/webm 청크 제출 시 FastAPI STT 파이프라인을 트리거하고 ResponseSubmitVoiceChunk를 반환한다")
        void submitVoiceChunk_success() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.VOICE, null, null);
            MultipartFile audioChunk = new MockMultipartFile("audioChunk", "chunk.webm", "audio/webm", new byte[1024]);

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));

            InterviewDTO.ResponseSubmitVoiceChunk result = interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, 1, 0, false);

            assertThat(result.chunkIndex()).isEqualTo(0);
            assertThat(result.received()).isTrue();
            verify(fastApiClient).triggerSttPipeline(sessionId, audioChunk, 1, 0, false);
        }

        @Test
        @DisplayName("audio/mp4 포맷도 허용된다")
        void submitVoiceChunk_mp4_allowed() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.VOICE, null, null);
            MultipartFile audioChunk = new MockMultipartFile("audioChunk", "chunk.mp4", "audio/mp4", new byte[512]);

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));

            InterviewDTO.ResponseSubmitVoiceChunk result = interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, 1, 1, true);

            assertThat(result.received()).isTrue();
        }

        @Test
        @DisplayName("지원하지 않는 오디오 포맷이면 INTERVIEW_INVALID_AUDIO_FORMAT(400)을 던진다")
        void submitVoiceChunk_invalidContentType_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            MultipartFile audioChunk = new MockMultipartFile("audioChunk", "chunk.wav", "audio/wav", new byte[1024]);

            assertThatThrownBy(() -> interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, 1, 0, false))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_INVALID_AUDIO_FORMAT));

            verify(fastApiClient, never()).triggerSttPipeline(any(), any(), anyInt(), anyInt(), anyBoolean());
        }

        @Test
        @DisplayName("Content-Type이 null이면 INTERVIEW_INVALID_AUDIO_FORMAT(400)을 던진다")
        void submitVoiceChunk_nullContentType_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            MultipartFile audioChunk = new MockMultipartFile("audioChunk", "chunk.webm", null, new byte[1024]);

            assertThatThrownBy(() -> interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, 1, 0, false))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_INVALID_AUDIO_FORMAT));
        }

        @Test
        @DisplayName("타인 세션에 접근하면 INTERVIEW_SESSION_FORBIDDEN(403)을 던진다")
        void submitVoiceChunk_forbidden_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            MultipartFile audioChunk = new MockMultipartFile("audioChunk", "chunk.webm", "audio/webm", new byte[1024]);

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.empty());

            assertThatThrownBy(() -> interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, 1, 0, false))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_FORBIDDEN));
        }

        @Test
        @DisplayName("종료된 세션에 청크 제출 시 INTERVIEW_SESSION_ALREADY_ENDED(400)을 던진다")
        void submitVoiceChunk_alreadyEnded_throwsException() {
            UUID memberId = UUID.randomUUID();
            UUID sessionId = UUID.randomUUID();
            InterviewSession session = InterviewSession.create(memberId, null, SessionType.VOICE, null, null);
            session.complete(java.time.ZonedDateTime.now());
            MultipartFile audioChunk = new MockMultipartFile("audioChunk", "chunk.webm", "audio/webm", new byte[1024]);

            given(sessionRepository.findBySessionIdAndMemberId(sessionId, memberId)).willReturn(Optional.of(session));

            assertThatThrownBy(() -> interviewSessionService.submitVoiceChunk(memberId, sessionId, audioChunk, 1, 0, false))
                    .isInstanceOf(CustomException.class)
                    .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                            .isEqualTo(InterviewErrorCode.INTERVIEW_SESSION_ALREADY_ENDED));
        }
    }
}
