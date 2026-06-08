package kr.co.carrer.global.response;

import java.util.List;

public record PaginationResponse<T>(
    List<T> items,
    int page,
    int size,
    long totalItems,
    int totalPages
) {
    public static <T> PaginationResponse<T> of(List<T> items, int page, int size, long totalItems) {
        int totalPages = (int) Math.ceil((double) totalItems / size);
        return new PaginationResponse<>(items, page, size, totalItems, totalPages);
    }
}
