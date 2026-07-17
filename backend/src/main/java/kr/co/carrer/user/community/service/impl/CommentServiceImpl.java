package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.community.dto.CommentDTO;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.entity.Comment;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.repository.CommentRepository;
import kr.co.carrer.user.community.service.CommentService;
import kr.co.carrer.user.member.entity.Member;
import kr.co.carrer.user.member.repository.UserMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CommentServiceImpl implements CommentService {

    private static final String UNKNOWN_MEMBER_NAME = "알 수 없는 사용자";

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final UserMemberRepository memberRepository;

    public CommentServiceImpl(
            BoardRepository boardRepository,
            CommentRepository commentRepository,
            UserMemberRepository memberRepository) {
        this.boardRepository = boardRepository;
        this.commentRepository = commentRepository;
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentDTO.Response> getComments(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

        List<Comment> comments = commentRepository.findByBoardIdAndBlindFalseOrderByCreatedAtAsc(board.getBoardId());

        Set<UUID> memberIds = comments.stream()
                .map(Comment::getMemberId)
                .collect(Collectors.toSet());

        Map<UUID, String> memberNames = memberRepository.findAllById(memberIds)
                .stream()
                .collect(Collectors.toMap(Member::getMemberId, Member::getName));

        return comments.stream()
                .map(comment -> CommentDTO.Response.from(
                        comment,
                        memberNames.getOrDefault(comment.getMemberId(), UNKNOWN_MEMBER_NAME)))
                .toList();
    }

    @Override
    @Transactional
    public CommentDTO.Response createComment(
            UUID memberId,
            Long boardId,
            CommentDTO.CreateRequest request) {

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

        Comment savedComment = commentRepository.save(comment);

        return toResponse(savedComment);
    }

    @Override
    @Transactional
    public CommentDTO.Response updateComment(
            UUID memberId,
            Long commentId,
            CommentDTO.UpdateRequest request) {

        Comment comment = commentRepository.findById(commentId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getMemberId().equals(memberId)) {
            throw new CustomException(
                    CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        comment.update(request.content());

        return toResponse(comment);
    }

    @Override
    @Transactional
    public void deleteComment(UUID memberId, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .filter(item -> !item.getBlind())
                .orElseThrow(() -> new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getMemberId().equals(memberId)) {
            throw new CustomException(
                    CommunityErrorCode.COMMUNITY_ACCESS_DENIED);
        }

        comment.blind();
    }

    private CommentDTO.Response toResponse(Comment comment) {
        return CommentDTO.Response.from(
                comment,
                getMemberName(comment.getMemberId()));
    }

    private String getMemberName(UUID memberId) {
        return memberRepository.findById(memberId)
                .map(Member::getName)
                .orElse(UNKNOWN_MEMBER_NAME);
    }
}