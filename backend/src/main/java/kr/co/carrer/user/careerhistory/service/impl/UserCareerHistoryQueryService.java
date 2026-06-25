package kr.co.carrer.user.careerhistory.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryDetailResponse;
import kr.co.carrer.user.careerhistory.dto.UserCareerHistoryResponse;
import kr.co.carrer.user.careerhistory.exception.UserCareerHistoryErrorCode;
import kr.co.carrer.user.careerhistory.service.UserCareerHistoryService;
import kr.co.carrer.user.interview.entity.CareerHistory;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.projection.CareerHistoryWithSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserCareerHistoryQueryService implements UserCareerHistoryService {

    private final CareerHistoryRepository careerHistoryRepository;

    public UserCareerHistoryQueryService(CareerHistoryRepository careerHistoryRepository) {
        this.careerHistoryRepository = careerHistoryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<UserCareerHistoryResponse> getHistories(UUID memberId, int page, int size) {
        Page<CareerHistoryWithSession> historyPage = careerHistoryRepository
                .findHistoryByMemberId(memberId, PageRequest.of(page, size));

        List<UserCareerHistoryResponse> histories = historyPage.getContent()
                .stream()
                .map(UserCareerHistoryResponse::from)
                .toList();

        return PaginationResponse.of(histories, page, size, historyPage.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public UserCareerHistoryDetailResponse getHistoryDetail(UUID memberId, UUID sessionId) {
        CareerHistory history = careerHistoryRepository.findByMemberIdAndSessionId(memberId, sessionId)
                .orElseThrow(() -> new CustomException(UserCareerHistoryErrorCode.USER_CAREER_HISTORY_NOT_FOUND));

        return UserCareerHistoryDetailResponse.from(history);
    }
}