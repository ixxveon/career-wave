import { useState } from 'react';
import { FileSearch } from 'lucide-react';
import HistoryItem from '../../components/resume/HistoryItem';
import { useResumeHistory } from '../../hooks/resume/useResumeHistory';
import './ResumeHistoryPage.css';

const PAGE_SIZE = 10;

export default function ResumeHistoryPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useResumeHistory(page, PAGE_SIZE);

  return (
    <div className="rh">
      <div className="rh-header">
        <span className="rh-eyebrow">HISTORY</span>
        <h1 className="rh-title">서류 분석 이력</h1>
        <p className="rh-desc">AI가 분석한 이력서 및 자기소개서 결과를 최신순으로 확인할 수 있습니다.</p>
      </div>

      {isLoading && (
        <div className="rh-state" role="status" aria-label="불러오는 중">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rh-skeleton" aria-hidden="true" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rh-state rh-state--error" role="alert">
          <FileSearch size={36} aria-hidden="true" />
          <p>이력을 불러오는 중 오류가 발생했습니다.</p>
          <button
            type="button"
            className="rh-retry-btn"
            onClick={() => setPage(p => p)}
          >
            다시 시도
          </button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.content.length === 0 ? (
            <div className="rh-state rh-state--empty">
              <FileSearch size={40} aria-hidden="true" />
              <p className="rh-state__title">분석 이력이 없습니다</p>
              <p className="rh-state__desc">
                이력서 또는 자기소개서를 업로드하여 AI 분석을 시작해보세요.
              </p>
              <a href="/documents/resume" className="rh-cta-btn">
                분석 시작하기
              </a>
            </div>
          ) : (
            <>
              <p className="rh-count">총 {data.totalElements}건</p>
              <ul className="rh-list" aria-label="분석 이력 목록">
                {data.content.map(item => (
                  <li key={item.documentId}>
                    <HistoryItem item={item} />
                  </li>
                ))}
              </ul>

              {data.totalPages > 1 && (
                <nav className="rh-pagination" aria-label="페이지 탐색">
                  <button
                    type="button"
                    className="rh-page-btn"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    aria-label="이전 페이지"
                  >
                    ‹
                  </button>

                  {Array.from({ length: data.totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`rh-page-btn${i === page ? ' rh-page-btn--active' : ''}`}
                      onClick={() => setPage(i)}
                      aria-label={`${i + 1}페이지`}
                      aria-current={i === page ? 'page' : undefined}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="rh-page-btn"
                    disabled={page === data.totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    aria-label="다음 페이지"
                  >
                    ›
                  </button>
                </nav>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
