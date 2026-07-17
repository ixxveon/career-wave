package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.community.dto.CommentDTO;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.entity.Comment;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.repository.CommentRepository;
import kr.co.carrer.user.community.repository.CommunityReportRepository;
import kr.co.carrer.user.community.service.CommentService;
import kr.co.carrer.user.community.type.ReportTargetType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CommentServiceImpl implements CommentService {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final CommunityReportRepository reportRepository;

    public CommentServiceImpl(
            BoardRepository boardRepository,
            CommentRepository commentRepository,
            CommunityReportRepository reportRepository) {
        this.boardRepository = boardRepository;
        this.commentRepository = commentRepository;
        this.reportRepository = reportRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentDTO.Response> getComments(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        List<Comment> comments = commentRepository
                .findByBoardIdAndBlindFalseOrderByCreatedAtAsc(board.getBoardId());

        Map<Long, Long> reportCounts = getReportCounts(
                comments.stream().map(Comment::getCommentId).toList());

        return comments.stream()
                .map(comment -> CommentDTO.Response.from(
                        comment, reportCounts.getOrDefault(comment.getCommentId(), 0L)))
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
                request.content());

        return CommentDTO.Response.from(commentRepository.save(comment), 0L);
    }

    @Override
    @Transactional
    public void deleteComment(UUID memberId, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getMemberId().equals(memberId)) {
            throw new CustomException(CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        comment.blind();
    }

    private Map<Long, Long> getReportCounts(Collection<Long> commentIds) {
        if (commentIds.isEmpty()) {
            return Map.of();
        }

        return reportRepository.countGroupedByTargetId(ReportTargetType.COMMENT, commentIds)
                .stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}