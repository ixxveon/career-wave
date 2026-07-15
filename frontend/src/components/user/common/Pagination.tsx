import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const WINDOW_SIZE = 5;

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages < 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, WINDOW_SIZE) }, (_, i) => Math.max(1, page - 2) + i)
    .filter(p => p <= totalPages);

  return (
    <div className="cw-pagination">
      <button
        type="button"
        className="cw-pagination__arrow"
        aria-label="이전 페이지"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map(p => (
        <button
          type="button"
          key={p}
          className={`cw-pagination__btn${page === p ? ' cw-pagination__btn--on' : ''}`}
          aria-current={page === p ? 'page' : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="cw-pagination__arrow"
        aria-label="다음 페이지"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
