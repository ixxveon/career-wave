package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.community.dto.CommentDTO;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.entity.Comment;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.repository.CommentRepository;
import kr.co.carrer.user.community.service.CommentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CommentServiceImpl implements CommentService {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;

    public CommentServiceImpl(
            BoardRepository boardRepository,
            CommentRepository commentRepository
    ) {
        this.boardRepository = boardRepository;
        this.commentRepository = commentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentDTO.Response> getComments(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        return commentRepository.findByBoardIdAndBlindFalseOrderByCreatedAtAsc(board.getBoardId())
                .stream()
                .map(CommentDTO.Response::from)
                .toList();
    }

    @Override
    @Transactional
    public CommentDTO.Response createComment(UUID memberId, Long boardId, CommentDTO.CreateRequest request) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        if (request.parentId() != null) {
            Comment parent = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND));

            if (!parent.getBoardId().equals(board.getBoardId())) {
                throw new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND);
            }
        }

        Comment comment = new Comment(
                board.getBoardId(),
                memberId,
                request.parentId(),
                request.content()
        );

        return CommentDTO.Response.from(commentRepository.save(comment));
    }

    @Override
    @Transactional
    public void deleteComment(UUID memberId, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getMemberId().equals(memberId)) {
            throw new CustomException(CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        commentRepository.delete(comment);
    }
}