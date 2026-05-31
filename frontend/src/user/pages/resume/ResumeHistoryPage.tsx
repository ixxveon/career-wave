import { useState } from 'react';
import { FileSearch, FileText, ScrollText } from 'lucide-react';
import HistoryItem from '../../components/resume/HistoryItem';
import { useResumeHistory } from '../../hooks/resume/useResumeHistory';
import type { FileType } from '../../types/resume.d';
import './ResumeHistoryPage.css';

const PAGE_SIZE = 10;

const TYPE_TABS: { label: string; value: FileType | 'ALL'; Icon: typeof FileText }[] = [
  { label: '전체',       value: 'ALL',          Icon: FileSearch },
  { label: '이력서',     value: 'RESUME',        Icon: FileText   },
  { label: '자기소개서', value: 'COVER_LETTER',  Icon: ScrollText },
];

export default function ResumeHistoryPage() {
  const [page, setPage] = useState(0);
  const [activeType, setActiveType] = useState<FileType | 'ALL'>('ALL');
  const { data, isLoading, isError } = useResumeHistory(page, PAGE_SIZE);

  const filtered = data?.content.filter(
    item => activeType === 'ALL' || item.fileType === activeType,
  ) ?? [];

  function handleTabChange(type: FileType | 'ALL') {
    setActiveType(type);
    setPage(0);
  }

  return (
    <div className="rh">
      {/* 헤더 배너 */}
      <div className="rh-banner">
        <div className="rh-banner__text">
          <span className="rh-eyebrow">HISTORY</span>
          <h1 className="rh-title">서류 분석 이력</h1>
          <p className="rh-desc">AI가 분석한 이력서 및 자기소개서 결과를 최신순으로 확인할 수 있습니다.</p>
        </div>
        <a href="/documents/resume" className="rh-new-btn">+ 새 분석 시작</a>
      </div>

      {/* 카드 영역 */}
      <div className="rh-card">
        {/* 필터 탭 */}
        <div className="rh-tabs" role="tablist" aria-label="서류 유형 필터">
          {TYPE_TABS.map(({ label, value, Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={activeType === value}
              className={`rh-tab${activeType === value ? ' rh-tab--active' : ''}`}
              onClick={() => handleTabChange(value)}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* 로딩 */}
        {isLoading && (
          <div role="status" aria-label="불러오는 중">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rh-skeleton" aria-hidden="true" />
            ))}
          </div>
        )}

        {/* 에러 */}
        {isError && (
          <div className="rh-state rh-state--error" role="alert">
            <FileSearch size={36} aria-hidden="true" />
            <p>이력을 불러오는 중 오류가 발생했습니다.</p>
            <button type="button" className="rh-retry-btn" onClick={() => setPage(p => p)}>
              다시 시도
            </button>
          </div>
        )}

        {/* 목록 */}
        {!isLoading && !isError && data && (
          <>
            {filtered.length === 0 ? (
              <div className="rh-state rh-state--empty">
                <FileSearch size={40} aria-hidden="true" />
                <p className="rh-state__title">분석 이력이 없습니다</p>
                <p className="rh-state__desc">
                  이력서 또는 자기소개서를 업로드하여 AI 분석을 시작해보세요.
                </p>
                <a href="/documents/resume" className="rh-cta-btn">분석 시작하기</a>
              </div>
            ) : (
              <>
                <p className="rh-count">총 {data.totalElements}건</p>
                <ul className="rh-list" aria-label="분석 이력 목록">
                  {filtered.map(item => (
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
    </div>
  );
}
