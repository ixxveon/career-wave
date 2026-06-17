package kr.co.carrer.user.interview.service;

import kr.co.carrer.user.interview.dto.InterviewDTO;

import java.util.UUID;

public interface InterviewReportService {

    InterviewDTO.ResponseReport getReport(UUID memberId, UUID sessionId);
}
