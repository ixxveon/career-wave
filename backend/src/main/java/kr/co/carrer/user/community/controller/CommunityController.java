package kr.co.carrer.user.community.controller;

import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.docs.CommunityControllerDocs;
import kr.co.carrer.user.community.dto.BoardCreateRequest;
import kr.co.carrer.user.community.dto.BoardResponse;
import kr.co.carrer.user.community.dto.BoardUpdateRequest;
import kr.co.carrer.user.community.dto.CommentCreateRequest;
import kr.co.carrer.user.community.dto.CommentResponse;
import kr.co.carrer.user.community.dto.ReportCreateRequest;
import kr.co.carrer.user.community.service.BoardService;
import kr.co.carrer.user.community.service.CommentService;
import kr.co.carrer.user.community.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/community")
public class CommunityController implements CommunityControllerDocs {

    private final BoardService boardService;
    private final CommentService commentService;
    private final ReportService reportService;

    public CommunityController(
            BoardService boardService,
            CommentService commentService,
            ReportService reportService
    ) {
        this.boardService = boardService;
        this.commentService = commentService;
        this.reportService = reportService;
    }

    @Override
    @GetMapping("/boards")
    public ResponseEntity<ApiResponse<PaginationResponse<BoardResponse>>> getBoards(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.getBoards(category, page, size)));
    }

    @Override
    @GetMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<BoardResponse>> getBoard(@PathVariable Long boardId) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.getBoard(boardId)));
    }

    @Override
    @PostMapping("/boards")
    public ResponseEntity<ApiResponse<BoardResponse>> createBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BoardCreateRequest request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(boardService.createBoard(memberId, request)));
    }

    @Override
    @PutMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<BoardResponse>> updateBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId,
            @Valid @RequestBody BoardUpdateRequest request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(boardService.updateBoard(memberId, boardId, request)));
    }

    @Override
    @DeleteMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        boardService.deleteBoard(memberId, boardId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Override
    @GetMapping("/boards/{boardId}/comments")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(
            @PathVariable Long boardId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(commentService.getComments(boardId)));
    }

    @Override
    @PostMapping("/boards/{boardId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId,
            @Valid @RequestBody CommentCreateRequest request
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(commentService.createComment(memberId, boardId, request)));
    }

    @Override
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long commentId
    ) {
        UUID memberId = UUID.fromString(principal.getId());
        commentService.deleteComment(memberId, commentId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @Override
    @PostMapping("/reports")
    public ResponseEntity<ApiResponse<Void>> createReport(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ReportCreateRequest request
    ) {
        UUID reporterId = UUID.fromString(principal.getId());
        reportService.createReport(reporterId, request);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}