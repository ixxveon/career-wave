package kr.co.carrer.user.community.dto;

import kr.co.carrer.user.community.entity.Comment;

import java.time.ZonedDateTime;
import java.util.UUID;

public record CommentResponse(
        Long commentId,
        Long boardId,
        UUID memberId,
        Long parentId,
        String content,
        Boolean blind,
        ZonedDateTime createdAt,
        ZonedDateTime updatedAt
) {
    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getCommentId(),
                comment.getBoardId(),
                comment.getMemberId(),
                comment.getParentId(),
                comment.getContent(),
                comment.getBlind(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
}