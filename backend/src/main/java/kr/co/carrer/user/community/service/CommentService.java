package kr.co.carrer.user.community.service;

import kr.co.carrer.user.community.dto.CommentDTO;

import java.util.List;
import java.util.UUID;

public interface CommentService {

    List<CommentDTO.Response> getComments(Long boardId);

    CommentDTO.Response createComment(
            UUID memberId,
            Long boardId,
            CommentDTO.CreateRequest request);

    CommentDTO.Response updateComment(
            UUID memberId,
            Long commentId,
            CommentDTO.UpdateRequest request);

    void deleteComment(UUID memberId, Long commentId);
}