package kr.co.carrer.user.community.service;

import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardDTO;

import java.util.UUID;

public interface BoardService {

    PaginationResponse<BoardDTO.Response> getBoards(String category, int page, int size);

    BoardDTO.Response getBoard(Long boardId);

    BoardDTO.Response createBoard(UUID memberId, BoardDTO.CreateRequest request);

    BoardDTO.Response updateBoard(UUID memberId, Long boardId, BoardDTO.UpdateRequest request);

    void deleteBoard(UUID memberId, Long boardId);
}