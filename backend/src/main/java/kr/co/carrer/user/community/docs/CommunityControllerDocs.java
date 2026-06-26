package kr.co.carrer.user.community.docs;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardCreateRequest;
import kr.co.carrer.user.community.dto.BoardResponse;
import kr.co.carrer.user.community.dto.BoardUpdateRequest;
import kr.co.carrer.user.community.dto.CommentCreateRequest;
import kr.co.carrer.user.community.dto.CommentResponse;
import kr.co.carrer.user.community.dto.ReportCreateRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

public interface CommunityControllerDocs {

    ResponseEntity<ApiResponse<PaginationResponse<BoardResponse>>> getBoards(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    );

    ResponseEntity<ApiResponse<BoardResponse>> getBoard(
            @PathVariable Long boardId
    );

    ResponseEntity<ApiResponse<BoardResponse>> createBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody BoardCreateRequest request
    );

    ResponseEntity<ApiResponse<BoardResponse>> updateBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId,
            @RequestBody BoardUpdateRequest request
    );

    ResponseEntity<ApiResponse<Void>> deleteBoard(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId
    );

    ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(
            @PathVariable Long boardId
    );

    ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long boardId,
            @RequestBody CommentCreateRequest request
    );

    ResponseEntity<ApiResponse<Void>> deleteComment(
            @AuthenticationPrincipal AuthPrincipal principal,
            @PathVariable Long commentId
    );

    ResponseEntity<ApiResponse<Void>> createReport(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestBody ReportCreateRequest request
    );
}