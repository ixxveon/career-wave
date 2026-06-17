package kr.co.carrer.admin.aimetrics.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.co.carrer.admin.aimetrics.type.RagDocumentStatusType;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

public class RagDocumentDTO {

    private RagDocumentDTO() {
    }

    @Schema(description = "RAG 문서 업로드 요청")
    public record RequestUpload(
            @Schema(description = "multipart/form-data file 필드명")
            String file
    ) {
    }

    @Schema(description = "RAG 문서 목록 항목 응답")
    public record ResponseItem(
            @Schema(description = "RAG 문서 ID") Long ragDocumentId,
            @Schema(description = "업로더 관리자 ID") Long uploadedBy,
            @Schema(description = "파일 UUID") UUID fileUuid,
            @Schema(description = "원본 파일명") String originalFileName,
            @Schema(description = "MIME 타입") String mimeType,
            @Schema(description = "파일 크기") Long fileSize,
            @Schema(description = "청크 수") int chunkCount,
            @Schema(description = "인덱싱 진행률") int indexingProgress,
            @Schema(description = "인덱싱 상태", allowableValues = {"UPLOADED", "INDEXING", "COMPLETED", "FAILED"}) RagDocumentStatusType status,
            @Schema(description = "생성 시각") ZonedDateTime createdAt,
            @Schema(description = "수정 시각") ZonedDateTime updatedAt
    ) {
    }

    @Schema(description = "RAG 문서 상세 응답")
    public record ResponseDetail(
            @Schema(description = "RAG 문서 ID") Long ragDocumentId,
            @Schema(description = "업로더 관리자 ID") Long uploadedBy,
            @Schema(description = "파일 UUID") UUID fileUuid,
            @Schema(description = "원본 파일명") String originalFileName,
            @Schema(description = "저장 경로") String filePath,
            @Schema(description = "MIME 타입") String mimeType,
            @Schema(description = "파일 크기") Long fileSize,
            @Schema(description = "청크 수") int chunkCount,
            @Schema(description = "인덱싱 진행률") int indexingProgress,
            @Schema(description = "인덱싱 상태", allowableValues = {"UPLOADED", "INDEXING", "COMPLETED", "FAILED"}) RagDocumentStatusType status,
            @Schema(description = "생성 시각") ZonedDateTime createdAt,
            @Schema(description = "수정 시각") ZonedDateTime updatedAt
    ) {
    }

    @Schema(description = "RAG 문서 목록 응답")
    public record ResponseList(
            @Schema(description = "RAG 문서 목록") List<ResponseItem> content,
            @Schema(description = "현재 페이지, 1-based") int page,
            @Schema(description = "페이지 크기") int size,
            @Schema(description = "전체 건수") long totalElements,
            @Schema(description = "전체 페이지 수") int totalPages
    ) {
    }

    @Schema(description = "RAG 문서 다운로드 정보 응답")
    public record ResponseDownload(
            @Schema(description = "RAG 문서 ID") Long ragDocumentId,
            @Schema(description = "원본 파일명") String originalFileName,
            @Schema(description = "파일 UUID") UUID fileUuid,
            @Schema(description = "MIME 타입") String mimeType,
            @Schema(description = "파일 크기") Long fileSize,
            @Schema(description = "다운로드 URL") String downloadUrl
    ) {
    }

    @Schema(description = "RAG 문서 삭제 응답")
    public record ResponseDelete(
            @Schema(description = "삭제 대상 RAG 문서 ID") Long ragDocumentId,
            @Schema(description = "삭제 성공 여부") boolean deleted
    ) {
    }
}
