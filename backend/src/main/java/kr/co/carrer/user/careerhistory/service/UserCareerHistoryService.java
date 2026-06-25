package kr.co.carrer.user.careerhistory.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryResponse;

import java.util.UUID;

public interface UserCareerHistoryService {

    PaginationResponse<UserCareerHistoryResponse> getHistories(UUID memberId, int page, int size);

    UserCareerHistoryDetailResponse getHistoryDetail(UUID memberId, UUID sessionId);
}
