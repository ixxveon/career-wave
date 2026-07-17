package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardDTO;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.service.BoardService;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BoardServiceImpl implements BoardService {

    private static final String UNKNOWN_MEMBER_NAME = "알 수 없는 사용자";

    private final BoardRepository boardRepository;
    private final UserMemberRepository memberRepository;

    public BoardServiceImpl(
            BoardRepository boardRepository,
            UserMemberRepository memberRepository) {
        this.boardRepository = boardRepository;
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PaginationResponse<BoardDTO.Response> getBoards(
            String category,
            int page,
            int size) {
        int pageIndex = Math.max(page - 1, 0);

        PageRequest pageRequest = PageRequest.of(
                pageIndex,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Board> boardPage = category == null || category.isBlank()
                ? boardRepository.findByBlindFalse(pageRequest)
                : boardRepository.findByCategoryAndBlindFalse(category, pageRequest);

        List<Board> boardList = boardPage.getContent();

        Set<UUID> memberIds = boardList.stream()
                .map(Board::getMemberId)
                .collect(Collectors.toSet());

        Map<UUID, String> memberNames = memberRepository.findAllById(memberIds)
                .stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getName));

        List<BoardDTO.Response> boards = boardList.stream()
                .map(board -> BoardDTO.Response.from(
                        board,
                        memberNames.getOrDefault(board.getMemberId(), UNKNOWN_MEMBER_NAME)))
                .toList();

        return PaginationResponse.of(
                boards,
                page,
                size,
                boardPage.getTotalElements());
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

        return toResponse(updatedBoard);
    }

    @Override
    @Transactional
    public BoardDTO.Response createBoard(
            UUID memberId,
            BoardDTO.CreateRequest request) {
        Board board = new Board(
                memberId,
                request.category(),
                request.title(),
                request.content());

        Board savedBoard = boardRepository.save(board);

        return toResponse(savedBoard);
    }

    @Override
    @Transactional
    public BoardDTO.Response updateBoard(
            UUID memberId,
            Long boardId,
            BoardDTO.UpdateRequest request) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (!board.getMemberId().equals(memberId)) {
            throw new CustomException(
                    CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        board.update(
                request.category(),
                request.title(),
                request.content());

        return toResponse(board);
    }

    @Override
    @Transactional
    public void deleteBoard(UUID memberId, Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (!board.getMemberId().equals(memberId)) {
            throw new CustomException(
                    CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        board.blind();
    }

    private BoardDTO.Response toResponse(Board board) {
        return BoardDTO.Response.from(
                board,
                getMemberName(board.getMemberId()));
    }

    private String getMemberName(UUID memberId) {
        return memberRepository.findById(memberId)
                .map(Member::getName)
                .orElse(UNKNOWN_MEMBER_NAME);
    }
}