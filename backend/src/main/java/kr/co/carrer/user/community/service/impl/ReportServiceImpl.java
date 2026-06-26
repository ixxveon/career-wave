package kr.co.carrer.user.community.service.impl;

import kr.co.carrer.global.exception.CustomException;
import kr.co.carrer.user.community.dto.ReportCreateRequest;
import kr.co.carrer.user.community.entity.Board;
import kr.co.carrer.user.community.entity.Comment;
import kr.co.carrer.user.community.entity.Report;
import kr.co.carrer.user.community.exception.CommunityErrorCode;
import kr.co.carrer.user.community.repository.BoardRepository;
import kr.co.carrer.user.community.repository.CommentRepository;
import kr.co.carrer.user.community.repository.CommunityReportRepository;
import kr.co.carrer.user.community.service.ReportService;
import kr.co.carrer.user.community.type.ReportTargetType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ReportServiceImpl implements ReportService {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;
    private final CommunityReportRepository reportRepository;

    public ReportServiceImpl(
            BoardRepository boardRepository,
            CommentRepository commentRepository,
            CommunityReportRepository reportRepository
    ) {
        this.boardRepository = boardRepository;
        this.commentRepository = commentRepository;
        this.reportRepository = reportRepository;
    }

    @Override
    @Transactional
    public void createReport(UUID reporterId, ReportCreateRequest request) {
        reportRepository.findByReporterIdAndTargetTypeAndTargetId(
                reporterId,
                request.targetType(),
                request.targetId()
        ).ifPresent(report -> {
            throw new CustomException(CommunityErrorCode.DUPLICATE_REPORT);
        });

        UUID reportedMemberId = findReportedMemberId(request);

        Report report = new Report(
                reportedMemberId,
                reporterId,
                request.targetType(),
                request.targetId(),
                request.reason()
        );

        reportRepository.save(report);
    }

    private UUID findReportedMemberId(ReportCreateRequest request) {
        if (request.targetType() == ReportTargetType.BOARD) {
            Board board = boardRepository.findById(request.targetId())
                    .orElseThrow(() -> new CustomException(CommunityErrorCode.BOARD_NOT_FOUND));

            return board.getMemberId();
        }

        if (request.targetType() == ReportTargetType.COMMENT) {
            Comment comment = commentRepository.findById(request.targetId())
                    .orElseThrow(() -> new CustomException(CommunityErrorCode.COMMENT_NOT_FOUND));

            return comment.getMemberId();
        }

        throw new CustomException(CommunityErrorCode.UNSUPPORTED_REPORT_TARGET);
    }
}