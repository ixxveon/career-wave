package kr.co.carrer.user.interview.service;

import kr.co.carrer.user.interview.dto.InterviewDTO;

import java.util.UUID;

public interface InterviewSessionService {

    InterviewDTO.ResponseStartSession startSession(UUID memberId, InterviewDTO.RequestStartSession dto);

    InterviewDTO.ResponseSubmitTextAnswer submitTextAnswer(UUID memberId, UUID sessionId, InterviewDTO.RequestSubmitTextAnswer dto);

    InterviewDTO.ResponseEndSession endSession(UUID memberId, UUID sessionId);
}
