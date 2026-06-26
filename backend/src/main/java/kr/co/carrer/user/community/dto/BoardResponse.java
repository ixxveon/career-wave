package kr.co.carrer.user.community.dto;

import kr.co.carrer.user.community.entity.Board;

import java.time.ZonedDateTime;
import java.util.UUID;

public record BoardResponse(
        Long boardId,
        UUID memberId,
        String category,
        String title,
        String content,
        Integer viewCount,
        Boolean blind,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
) {
    public static BoardResponse from(Board board) {
        return new BoardResponse(
                board.getBoardId(),
                board.getMemberId(),
                board.getCategory(),
                board.getTitle(),
                board.getContent(),
                board.getViewCount(),
                board.getBlind(),
                board.getCreatedAt(),
                board.getUpdatedAt()
        );
    }
}