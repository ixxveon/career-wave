package kr.co.carrer.user.community.controller;

import jakarta.validation.Valid;
import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.docs.CommunityControllerDocs;
import kr.co.carrer.user.community.dto.BoardDTO;
import kr.co.carrer.user.community.dto.CommentDTO;
import kr.co.carrer.user.community.dto.ReportDTO;
import kr.co.carrer.user.community.service.BoardService;
import kr.co.carrer.user.community.service.CommentService;
import kr.co.carrer.user.community.service.ReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/community")
public class CommunityController implements CommunityControllerDocs {

    private final BoardService boardService;
    private final CommentService commentService;
    private final ReportService reportService;

    public CommunityController(BoardService boardService, CommentService commentService, ReportService reportService) {
        this.boardService = boardService;
        this.commentService = commentService;
        this.reportService = reportService;
    }

    @Override
    @GetMapping("/boards")
    public ResponseEntity<ApiResponse<PaginationResponse<BoardDTO.Response>>> getBoards(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.getBoards(category, page, size)));
    }

    @Override
    @GetMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<BoardDTO.Response>> getBoard(@PathVariable Long boardId) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.getBoard(boardId)));
    }

    @Override
    @GetMapping("/boards/{boardId}/edit")
    public ResponseEntity<ApiResponse<BoardDTO.Response>> getBoardForEdit(
            @PathVariable Long boardId) {
        return ResponseEntity.ok(
                ApiResponse.ok(boardService.getBoardForEdit(boardId)));
    }

    @Override
    @PostMapping("/boards")
    public ResponseEntity<ApiResponse<BoardDTO.Response>> createBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody BoardDTO.CreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.createBoard(getMemberId(principal), request)));
    }

    @Override
    @PutMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<BoardDTO.Response>> updateBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId,
            @Valid @RequestBody BoardDTO.UpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(boardService.updateBoard(getMemberId(principal), boardId, request)));
    }

    @Override
    @DeleteMapping("/boards/{boardId}")
    public ResponseEntity<ApiResponse<Void>> deleteBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId) {
        boardService.deleteBoard(getMemberId(principal), boardId);
        return ResponseEntity.ok(ApiResponse.ok((Void) null));
    }

    @Override
    @GetMapping("/boards/{boardId}/comments")
    public ResponseEntity<ApiResponse<List<CommentDTO.Response>>> getComments(@PathVariable Long boardId) {
        return ResponseEntity.ok(ApiResponse.ok(commentService.getComments(boardId)));
    }

    @Override
    @PostMapping("/boards/{boardId}/comments")
    public ResponseEntity<ApiResponse<CommentDTO.Response>> createComment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId,
            @Valid @RequestBody CommentDTO.CreateRequest request) {
        return ResponseEntity
                .ok(ApiResponse.ok(commentService.createComment(getMemberId(principal), boardId, request)));
    }

    @Override
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long commentId) {
        commentService.deleteComment(getMemberId(principal), commentId);
        return ResponseEntity.ok(ApiResponse.ok((Void) null));
    }

    @Override
    @PostMapping("/reports")
    public ResponseEntity<ApiResponse<Void>> createReport(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody ReportDTO.CreateRequest request) {
        reportService.createReport(getMemberId(principal), request);
        return ResponseEntity.ok(ApiResponse.ok((Void) null));
    }

    private UUID getMemberId(AuthPrincipal principal) {
        return UUID.fromString(principal.getId());
    }
}