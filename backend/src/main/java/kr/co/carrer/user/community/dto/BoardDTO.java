package kr.co.carrer.user.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.co.carrer.user.community.entity.Board;

import java.time.ZonedDateTime;
import java.util.UUID;

public class BoardDTO {

        public record CreateRequest(
                        @NotBlank @Size(max = 30) String category,

                        @NotBlank @Size(max = 200) String title,

                        @NotBlank String content) {
        }

        public record UpdateRequest(
                        @NotBlank @Size(max = 30) String category,

                        @NotBlank @Size(max = 200) String title,

                        @NotBlank String content) {
        }

        public record Response(
                        Long boardId,
                        UUID memberId,
                        String memberName,
                        String category,
                        String title,
                        String content,
                        Integer viewCount,
                        Boolean blind,
                        ZonedDateTime createdAt,
                        ZonedDateTime updatedAt) {
                public static Response from(Board board, String memberName) {
                        return new Response(
                                        board.getBoardId(),
                                        board.getMemberId(),
                                        memberName,
                                        board.getCategory(),
                                        board.getTitle(),
                                        board.getContent(),
                                        board.getViewCount(),
                                        board.getBlind(),
                                        board.getCreatedAt(),
                                        board.getUpdatedAt());
                }
        }
}