package kr.co.carrer.user.interview.service;

import kr.co.carrer.user.interview.dto.InterviewDTO;

import java.util.UUID;

public interface InterviewCallbackService {

    void processReportCallback(UUID sessionId, InterviewDTO.RequestReportCallback dto);
}
