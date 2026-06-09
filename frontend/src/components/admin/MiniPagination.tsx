interface MiniPaginationProps {
  page: number;
  totalPages: number;
  onChange: (nextPage: number) => void;
  className?: string;
  activeClassName?: string;
  showWhenSingle?: boolean;
}

export default function MiniPagination({
  page,
  totalPages,
  onChange,
  className,
  activeClassName = 'active',
  showWhenSingle = false,
}: MiniPaginationProps) {
  if (!showWhenSingle && totalPages <= 1) return null;

  return (
    <div className={className}>
      <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>
        {'<'}
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          className={pageNumber === page ? activeClassName : ''}
          onClick={() => onChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
      <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
        {'>'}
      </button>
    </div>
  );
}
