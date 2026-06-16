package kr.co.carrer.user.interview.service;

import kr.co.carrer.user.interview.dto.InterviewDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface InterviewSessionService {

    InterviewDTO.ResponseStartSession startSession(UUID memberId, InterviewDTO.RequestStartSession dto);

    InterviewDTO.ResponseSubmitTextAnswer submitTextAnswer(UUID memberId, UUID sessionId, InterviewDTO.RequestSubmitTextAnswer dto);

    InterviewDTO.ResponseSubmitVoiceChunk submitVoiceChunk(UUID memberId, UUID sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal);

    InterviewDTO.ResponseEndSession endSession(UUID memberId, UUID sessionId);
}
