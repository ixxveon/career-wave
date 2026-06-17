package kr.co.carrer.user.interview.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;

import java.util.UUID;

public interface InterviewHistoryService {

    PaginationResponse<InterviewDTO.HistoryItem> getHistory(UUID memberId, int page, int size);
}
