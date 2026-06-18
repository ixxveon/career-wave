import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ExternalLink,
  Link2,
  MapPin,
  Timer,
  X,
} from 'lucide-react';
import { useJobNoticeDetail } from '../../../hooks/user/jobNotice/useJobNoticeDetail';
import { mapJobNoticeApiToViewModel, type JobNotice } from '../../../types/user/jobNotice';
import '@/styles/user/jobNotice/JobNoticeDetail.css';

const TABS = ['공고 상세', '기업 정보'] as const;
type DetailTab = (typeof TABS)[number];
type DetailQueryStatus = 'loading' | 'success' | 'empty' | 'error';

function getDetailTabId(tab: DetailTab) {
  return `jobnotice-tab-${TABS.indexOf(tab)}`;
}

function getDetailPanelId(tab: DetailTab) {
  return `jobnotice-panel-${TABS.indexOf(tab)}`;
}

const STACKS_BY_JOB_CATEGORY: Partial<Record<JobNotice['jobCategory'], string[]>> = {
  백엔드: ['Java', 'Spring Boot', 'AWS', 'Docker', 'MySQL'],
  프론트엔드: ['React', 'TypeScript', 'Next.js', 'CSS', 'Vite'],
  데이터: ['Python', 'SQL', 'TensorFlow', 'Airflow', 'AWS'],
  DevOps: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'Terraform'],
};

const DETAIL_FIELD_SECTIONS = [
  { title: '담당 업무', field: 'responsibilities' },
  { title: '자격 요건', field: 'requirements' },
  { title: '우대 사항', field: 'preferredQualifications' },
  { title: '전형 절차', field: 'process' },
  { title: '근무 조건', field: 'workConditions' },
] as const;

function EmptyDetail({ onClose }: { onClose: () => void }) {
  return (
    <div className="jnd-empty">
      <BriefcaseBusiness size={26} />
      <strong>공고 정보를 불러올 수 없습니다.</strong>
      <span>목록에서 다른 공고를 선택해 주세요.</span>
      <button type="button" onClick={onClose}>닫기</button>
    </div>
  );
}

function DetailQueryStatusNotice({
  status,
  onClose,
  onRetry,
}: {
  status: DetailQueryStatus;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (status === 'success') return null;

  const statusMessage = {
    loading: '상세 정보를 불러오는 중입니다.',
    empty: '상세 응답 데이터가 없어 목록 요약 정보로 표시합니다.',
    error: '상세 정보를 불러오지 못해 목록 요약 정보로 표시합니다.',
  }[status];

  return (
    <div
      className={`jnd-status jnd-status--${status}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span>{statusMessage}</span>
      {status === 'error' && (
        <div className="jnd-status__actions">
          <button type="button" onClick={onRetry}>다시 시도</button>
          <button type="button" onClick={onClose}>닫기</button>
        </div>
      )}
    </div>
  );
}

interface DetailHeaderProps {
  job: JobNotice;
  bookmarked: boolean;
  onBookmark: (id: number) => void;
  onClose: () => void;
}

function DetailHeader({ job, bookmarked, onBookmark, onClose }: DetailHeaderProps) {
  const originalJobUrl = getOriginalJobUrl(job);

  return (
    <header className="jnd-header">
      <div className="jnd-logo">{job.company[0]}</div>
      <div className="jnd-title">
        <span>{job.company}</span>
        <h2>{job.title}</h2>
      </div>
      <div className="jnd-header__actions">
        <button
          type="button"
          className={`jnd-icon-btn${bookmarked ? ' is-active' : ''}`}
          aria-label={`${job.title} ${bookmarked ? '북마크 해제' : '북마크'}`}
          aria-pressed={bookmarked}
          onClick={(event) => {
            event.stopPropagation();
            onBookmark(job.id);
          }}
        >
          {bookmarked ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
        </button>
        {originalJobUrl ? (
          <a
            className="jnd-open-btn"
            href={originalJobUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${job.title} 원본 공고 새 탭에서 열기`}
          >
            원본 공고 <ExternalLink size={15} />
          </a>
        ) : (
          <button
            type="button"
            className="jnd-open-btn"
            aria-label={`${job.title} 원본 공고 URL 없음`}
            disabled
          >
            원본 없음 <ExternalLink size={15} />
          </button>
        )}
        <button type="button" className="jnd-close-btn" aria-label="상세 닫기" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
    </header>
  );
}

function InfoGrid({ job }: { job: JobNotice }) {
  const infoItems = [
    { label: '경력', value: job.exp, Icon: BriefcaseBusiness },
    { label: '고용 형태', value: job.employment, Icon: CheckCircle2 },
    { label: '근무 지역', value: job.location, Icon: MapPin },
    { label: '마감일', value: job.deadline, Icon: Timer },
    { label: '출처 사이트', value: job.source, Icon: Link2 },
  ];

  return (
    <section className="jnd-info-grid" aria-label="공고 핵심 정보">
      {infoItems.map(({ label, value, Icon }) => (
        <article className="jnd-info-card" key={label}>
          <Icon size={15} />
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

function getOriginalJobUrl(job: JobNotice) {
  if (job.originalUrl) return job.originalUrl;

  const title = job.title.trim();
  return title ? `https://www.wanted.co.kr/search?query=${encodeURIComponent(title)}` : null;
}

function DetailTabContent({ activeTab, job }: { activeTab: DetailTab; job: JobNotice }) {
  if (activeTab === '기업 정보') {
    return (
      <article className="jnd-job-description">
        <section className="jnd-description-section">
          <h3><Building2 size={17} /> 기업 정보</h3>
          <ul>
            <li>회사명: {job.company}</li>
            <li>업종: {job.industry || `${job.jobCategory} 서비스`}</li>
            <li>기업 규모: {job.companySize}</li>
          </ul>
        </section>

        <section className="jnd-description-section">
          <h3>회사 소개</h3>
          <ul>
            <li>{job.companyDescription || `${job.company}는 실무 역량과 협업 방식을 중요하게 보는 IT 기업입니다.`}</li>
            <li>지원 전 원본 공고에서 최신 채용 조건과 기업 소개를 함께 확인해 주세요.</li>
          </ul>
        </section>
      </article>
    );
  }

  const detailSections = DETAIL_FIELD_SECTIONS.flatMap(({ title, field }) => {
    const items = job[field];
    return items?.length ? [{ title, items }] : [];
  });

  if (detailSections.length > 0) {
    return (
      <article className="jnd-job-description">
        {detailSections.map((section) => (
          <section className="jnd-description-section" key={section.title}>
            <h3>{section.title}</h3>
            <ul>
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
        <section className="jnd-description-section">
          <h3>마감 정보</h3>
          <ul>
            <li>{job.deadline}</li>
            <li>정확한 마감 일정은 원본 공고에서 확인해 주세요.</li>
          </ul>
        </section>
      </article>
    );
  }

  return (
    <article className="jnd-job-description">
      <section className="jnd-description-section">
        <h3>마감 정보</h3>
        <ul>
          <li>{job.deadline}</li>
          <li>상세 항목이 제공되지 않았습니다. 정확한 내용은 원본 공고에서 확인해 주세요.</li>
        </ul>
      </section>
    </article>
  );
}

function TechStackStrip({ job }: { job: JobNotice }) {
  const stacks = job.stacks || STACKS_BY_JOB_CATEGORY[job.jobCategory] || job.tags;

  return (
    <section className="jnd-stack-strip" aria-label="기술 스택">
      <span>기술 스택</span>
      <div>
        {stacks.map((stack) => <em key={stack}>{stack}</em>)}
      </div>
    </section>
  );
}

export default function JobNoticeDetail({
  job,
  isOpen,
  bookmarked,
  onClose,
  onBookmark,
}: {
  job: JobNotice | null;
  isOpen: boolean;
  bookmarked: boolean;
  onClose: () => void;
  onBookmark: (id: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(TABS[0]);
  const detailQuery = useJobNoticeDetail(isOpen ? job?.id : null);
  const detailJob =
    detailQuery.data?.data && job && detailQuery.data.data.jobNoticeId === job.id
      ? mapJobNoticeApiToViewModel(detailQuery.data.data)
      : null;
  const displayJob = detailJob ? { ...job, ...detailJob } : job;
  const originalJobUrl = displayJob ? getOriginalJobUrl(displayJob) : null;
  const detailStatus: DetailQueryStatus = (() => {
    if (!job) return 'empty';
    if (detailQuery.isError) return 'error';
    if (detailQuery.isFetching && !detailJob) return 'loading';
    if (detailQuery.isSuccess && !detailQuery.data?.data) return 'empty';
    return detailJob ? 'success' : 'loading';
  })();

  function handleDetailTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    tab: DetailTab,
  ) {
    const currentIndex = TABS.indexOf(tab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab);
    const tabButtons = event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    tabButtons?.[nextIndex]?.focus();
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setActiveTab(TABS[0]);
  }, [isOpen, job?.id]);

  if (!isOpen) return null;

  return (
    <div className="jnd-overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="jnd-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="채용 공고 상세"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {!displayJob && <EmptyDetail onClose={onClose} />}
        {displayJob && (
          <>
            <div className="jnd-scroll">
              <DetailHeader
                job={displayJob}
                bookmarked={bookmarked}
                onBookmark={onBookmark}
                onClose={onClose}
              />
              <InfoGrid job={displayJob} />
              <DetailQueryStatusNotice
                status={detailStatus}
                onClose={onClose}
                onRetry={() => {
                  void detailQuery.refetch();
                }}
              />
              <nav className="jnd-tabs" role="tablist" aria-label="공고 상세 탭">
                {TABS.map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    id={getDetailTabId(tab)}
                    className={activeTab === tab ? 'is-active' : ''}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={getDetailPanelId(tab)}
                    aria-label={`${tab} 탭 보기`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={(event) => handleDetailTabKeyDown(event, tab)}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
              {TABS.map((tab) => (
                <section
                  key={tab}
                  id={getDetailPanelId(tab)}
                  role="tabpanel"
                  aria-labelledby={getDetailTabId(tab)}
                  hidden={activeTab !== tab}
                >
                  <TechStackStrip job={displayJob} />
                  <DetailTabContent activeTab={tab} job={displayJob} />
                </section>
              ))}
            </div>

            <footer className="jnd-action-bar">
              <button
                type="button"
                className={`jnd-action-btn${bookmarked ? ' is-active' : ''}`}
                aria-label={`${displayJob.title} ${bookmarked ? '북마크 해제' : '북마크'}`}
                aria-pressed={bookmarked}
                onClick={(event) => {
                  event.stopPropagation();
                  onBookmark(displayJob.id);
                }}
              >
                {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                북마크
              </button>
              {originalJobUrl ? (
                <a
                  className="jnd-action-btn jnd-action-btn--primary"
                  href={originalJobUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${displayJob.title} 원본 공고 새 탭에서 열기`}
                >
                  <ExternalLink size={17} />
                  원본 공고 보러가기
                </a>
              ) : (
                <div className="jnd-action-disabled">
                  <button
                    type="button"
                    className="jnd-action-btn jnd-action-btn--primary"
                    aria-label={`${displayJob.title} 원본 공고 URL 없음`}
                    disabled
                  >
                    <ExternalLink size={17} />
                    원본 URL 없음
                  </button>
                  <span>원본 공고 URL과 검색어를 구성할 제목이 없어 이동할 수 없습니다.</span>
                </div>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
