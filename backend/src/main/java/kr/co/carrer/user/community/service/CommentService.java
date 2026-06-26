package kr.co.carrer.user.community.service;

import kr.co.carrer.user.community.dto.CommentCreateRequest;
import kr.co.carrer.user.community.dto.CommentResponse;

import java.util.List;
import java.util.UUID;

public interface CommentService {

    List<CommentResponse> getComments(Long boardId);

    CommentResponse createComment(UUID memberId, Long boardId, CommentCreateRequest request);

    void deleteComment(UUID memberId, Long commentId);
}
