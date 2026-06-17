package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.projection.CareerHistoryWithSession;
import kr.co.carrer.user.interview.service.InterviewHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewHistoryServiceImpl implements InterviewHistoryService {

    private final CareerHistoryRepository careerHistoryRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<InterviewDTO.HistoryItem> getHistory(UUID memberId, int page, int size) {
        Page<CareerHistoryWithSession> historyPage = careerHistoryRepository
                .findHistoryByMemberId(memberId, PageRequest.of(page, size));

        List<InterviewDTO.HistoryItem> items = historyPage.getContent().stream()
                .map(this::toHistoryItem)
                .toList();

        return PaginationResponse.of(items, page, size, historyPage.getTotalElements());
    }

    private InterviewDTO.HistoryItem toHistoryItem(CareerHistoryWithSession row) {
        return new InterviewDTO.HistoryItem(
                row.getCareerHistoryId(),
                row.getSessionId() != null ? row.getSessionId().toString() : null,
                row.getSessionType() != null ? row.getSessionType().name() : null,
                row.getInterviewType() != null ? row.getInterviewType().name() : null,
                row.getTargetCompany(),
                row.getSessionStatus() != null ? row.getSessionStatus().name() : null,
                row.getTotalScore(),
                row.getPdfUrl(),
                row.getCreatedAt()
        );
    }
}
