package kr.co.carrer.user.community.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardCreateRequest;
import kr.co.carrer.user.community.dto.BoardResponse;
import kr.co.carrer.user.community.dto.BoardUpdateRequest;

import java.util.UUID;

public interface BoardService {

    PaginationResponse<BoardResponse> getBoards(String category, int page, int size);

    BoardResponse getBoard(Long boardId);

    BoardResponse createBoard(UUID memberId, BoardCreateRequest request);

    BoardResponse updateBoard(UUID memberId, Long boardId, BoardUpdateRequest request);

    void deleteBoard(UUID memberId, Long boardId);
}