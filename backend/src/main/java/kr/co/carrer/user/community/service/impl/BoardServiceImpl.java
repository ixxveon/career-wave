package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardDTO;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.repository.CommunityReportRepository;
import kr.co.carrer.user.community.service.BoardService;
import kr.co.carrer.user.community.type.ReportTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;
    private final CommunityReportRepository reportRepository;

    public BoardServiceImpl(BoardRepository boardRepository, CommunityReportRepository reportRepository) {
        this.boardRepository = boardRepository;
        this.reportRepository = reportRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<BoardDTO.Response> getBoards(String category, int page, int size) {
        int pageIndex = Math.max(page - 1, 0);

        PageRequest pageRequest = PageRequest.of(
                pageIndex,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Board> boardPage = category == null || category.isBlank()
                ? boardRepository.findByBlindFalse(pageRequest)
                : boardRepository.findByCategoryAndBlindFalse(category, pageRequest);

        List<Board> boardList = boardPage.getContent();
        Map<Long, Long> reportCounts = getReportCounts(
                boardList.stream().map(Board::getBoardId).toList());

        List<BoardDTO.Response> boards = boardList.stream()
                .map(board -> BoardDTO.Response.from(
                        board, reportCounts.getOrDefault(board.getBoardId(), 0L)))
                .toList();

        return PaginationResponse.of(boards, page, size, boardPage.getTotalElements());
    }

    @Override
    @Transactional
    public BoardDTO.Response getBoard(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        boardRepository.increaseViewCount(board.getBoardId());

        Board updatedBoard = boardRepository.findById(board.getBoardId())
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        long reportCount = reportRepository.countByTargetTypeAndTargetId(
                ReportTargetType.BOARD, updatedBoard.getBoardId());

        return BoardDTO.Response.from(updatedBoard, reportCount);
    }

    @Override
    @Transactional
    public BoardDTO.Response createBoard(UUID memberId, BoardDTO.CreateRequest request) {
        Board board = new Board(
                memberId,
                request.category(),
                request.title(),
                request.content());

        return BoardDTO.Response.from(boardRepository.save(board), 0L);
    }

    @Override
    @Transactional
    public BoardDTO.Response updateBoard(UUID memberId, Long boardId, BoardDTO.UpdateRequest request) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (!board.getMemberId().equals(memberId)) {
            throw new CustomException(CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        board.update(
                request.category(),
                request.title(),
                request.content());

        long reportCount = reportRepository.countByTargetTypeAndTargetId(
                ReportTargetType.BOARD, board.getBoardId());

        return BoardDTO.Response.from(board, reportCount);
    }

    @Override
    @Transactional
    public void deleteBoard(UUID memberId, Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (!board.getMemberId().equals(memberId)) {
            throw new CustomException(CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        board.blind();
    }

    private Map<Long, Long> getReportCounts(Collection<Long> boardIds) {
        if (boardIds.isEmpty()) {
            return Map.of();
        }

        return reportRepository.countGroupedByTargetId(ReportTargetType.BOARD, boardIds)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}