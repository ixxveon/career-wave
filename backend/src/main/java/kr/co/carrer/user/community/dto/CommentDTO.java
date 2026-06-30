package kr.co.carrer.user.community.dto;

import jakarta.validation.constraints.NotBlank;
import kr.co.carrer.user.community.entity.Comment;

import java.time.ZonedDateTime;
import java.util.UUID;

public class CommentDTO {

    public record CreateRequest(
            Long parentId,

            @NotBlank
            String content
    ) {
    }

    public record Response(
            Long commentId,
            Long boardId,
            UUID memberId,
            Long parentId,
            String content,
            Boolean blind,
            ZonedDateTime createdAt,
            ZonedDateTime updatedAt
    ) {
        public static Response from(Comment comment) {
            return new Response(
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
}
