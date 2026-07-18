package kr.co.carrer.user.community.docs;

import kr.co.carrer.auth.principal.AuthPrincipal;
import kr.co.carrer.global.response.ApiResponse;
import kr.co.carrer.global.response.PaginationResponse;
import kr.co.carrer.user.community.dto.BoardDTO;
import kr.co.carrer.user.community.dto.CommentDTO;
import kr.co.carrer.user.community.dto.ReportDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

public interface CommunityControllerDocs {

        ResponseEntity<ApiResponse<PaginationResponse<BoardDTO.Response>>> getBoards(
                        @RequestParam(required = false) String category,
                        @RequestParam(defaultValue = "1") int page,
                        @RequestParam(defaultValue = "10") int size);

        ResponseEntity<ApiResponse<BoardDTO.Response>> getBoard(
                        @PathVariable Long boardId);

        ResponseEntity<ApiResponse<BoardDTO.Response>> getBoardForEdit(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable Long boardId);

        ResponseEntity<ApiResponse<BoardDTO.Response>> createBoard(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @RequestBody BoardDTO.CreateRequest request);

        ResponseEntity<ApiResponse<BoardDTO.Response>> updateBoard(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable Long boardId,
                        @RequestBody BoardDTO.UpdateRequest request);

        ResponseEntity<ApiResponse<Void>> deleteBoard(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable Long boardId);

        ResponseEntity<ApiResponse<List<CommentDTO.Response>>> getComments(
                        @PathVariable Long boardId);

        ResponseEntity<ApiResponse<CommentDTO.Response>> createComment(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable Long boardId,
                        @RequestBody CommentDTO.CreateRequest request);

        ResponseEntity<ApiResponse<CommentDTO.Response>> updateComment(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable Long commentId,
                        @RequestBody CommentDTO.UpdateRequest request);

        ResponseEntity<ApiResponse<Void>> deleteComment(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @PathVariable Long commentId);

        ResponseEntity<ApiResponse<Void>> createReport(
                        @AuthenticationPrincipal AuthPrincipal principal,
                        @RequestBody ReportDTO.CreateRequest request);
}