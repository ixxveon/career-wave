package kr.co.carrer.user.interview.service.impl;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.interview.dto.InterviewDTO;
import kr.co.carrer.user.interview.entity.CareerHistory;
import kr.co.carrer.user.interview.entity.InterviewSession;
import kr.co.carrer.user.interview.repository.CareerHistoryRepository;
import kr.co.carrer.user.interview.repository.InterviewSessionRepository;
import kr.co.carrer.user.interview.service.InterviewHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewHistoryServiceImpl implements InterviewHistoryService {

    private final CareerHistoryRepository careerHistoryRepository;
    private final InterviewSessionRepository sessionRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<InterviewDTO.HistoryItem> getHistory(UUID memberId, int page, int size) {
        Page<CareerHistory> historyPage = careerHistoryRepository
                .findByMemberIdOrderByCreatedAtDesc(memberId, PageRequest.of(page, size));

        List<UUID> sessionIds = historyPage.getContent().stream()
                .map(CareerHistory::getSessionId)
                .toList();

        Map<UUID, InterviewSession> sessionMap = sessionRepository.findAllBySessionIdIn(sessionIds)
                .stream()
                .collect(Collectors.toMap(InterviewSession::getSessionId, s -> s));

        List<InterviewDTO.HistoryItem> items = historyPage.getContent().stream()
                .map(history -> toHistoryItem(history, sessionMap.get(history.getSessionId())))
                .toList();

        return PaginationResponse.of(items, page, size, historyPage.getTotalElements());
    }

    private InterviewDTO.HistoryItem toHistoryItem(CareerHistory history, InterviewSession session) {
        return new InterviewDTO.HistoryItem(
                history.getCareerHistoryId(),
                history.getSessionId().toString(),
                session != null ? session.getSessionType().name() : null,
                session != null && session.getInterviewType() != null ? session.getInterviewType().name() : null,
                session != null ? session.getTargetCompany() : null,
                session != null ? session.getSessionStatus().name() : null,
                history.getTotalScore(),
                history.getPdfUrl(),
                history.getCreatedAt()
        );
    }
}
