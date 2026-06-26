package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardCreateRequest;
import kr.co.carrer.user.community.dto.BoardResponse;
import kr.co.carrer.user.community.dto.BoardUpdateRequest;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.service.BoardService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;

    public BoardServiceImpl(BoardRepository boardRepository) {
        this.boardRepository = boardRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<BoardResponse> getBoards(String category, int page, int size) {
        Page<Board> boardPage = category == null || category.isBlank()
                ? boardRepository.findByBlindFalse(PageRequest.of(page, size))
                : boardRepository.findByCategoryAndBlindFalse(category, PageRequest.of(page, size));

        List<BoardResponse> boards = boardPage.getContent()
                .stream()
                .map(BoardResponse::from)
                .toList();

        return PaginationResponse.of(boards, page, size, boardPage.getTotalElements());
    }

    @Override
    @Transactional
    public BoardResponse getBoard(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        board.increaseViewCount();

        return BoardResponse.from(board);
    }

    @Override
    @Transactional
    public BoardResponse createBoard(UUID memberId, BoardCreateRequest request) {
        Board board = new Board(
                memberId,
                request.category(),
                request.title(),
                request.content()
        );

        return BoardResponse.from(boardRepository.save(board));
    }

    @Override
    @Transactional
    public BoardResponse updateBoard(UUID memberId, Long boardId, BoardUpdateRequest request) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (!board.getMemberId().equals(memberId)) {
            throw new CustomException(CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        board.update(
                request.category(),
                request.title(),
                request.content()
        );

        return BoardResponse.from(board);
    }

    @Override
    @Transactional
    public void deleteBoard(UUID memberId, Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (!board.getMemberId().equals(memberId)) {
            throw new CustomException(CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        boardRepository.delete(board);
    }
}
