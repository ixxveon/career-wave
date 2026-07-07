import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Eye,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import JobNoticeDetail from './JobNoticeDetail';
import { createBannerStats, type BannerStat } from './jobNoticeStats';
import {
  CAREER_LEVEL_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_NOTICE_ALL_FILTER_VALUE,
  JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES,
  JOB_NOTICE_FILTER_OPTIONS,
  JOB_TYPE_LABELS,
  mapJobNoticeApiToViewModel,
  type JobNotice,
  type JobNoticeBookmarkResponse,
  type JobNoticeBookmarkMap,
  type JobNoticeListStats,
  type JobNoticeQueryParams,
} from '../../../types/user/jobNotice';
import { jobApi } from '../../../api/user/jobApi';
import { useJobNoticeDetail } from '../../../hooks/user/jobNotice/useJobNoticeDetail';
import { useJobNoticeList } from '../../../hooks/user/jobNotice/useJobNoticeList';
import { authSession } from '../../../utils/user/member/authSession';
import '@/styles/user/jobNotice/JobNoticeListPage.css';

const PERIODS = ['오늘', '7일', '30일', '기간 전체'] as const;
const SORT_OPTIONS = ['추천순', '최신순', '조회순'] as const;
const DEFAULT_FILTER_VALUE = JOB_NOTICE_ALL_FILTER_VALUE;
const POPULAR_SEARCH_TAGS = ['백엔드', '프론트엔드', 'Java', 'React', 'Spring Boot', 'AWS', 'Python'];

const API_FILTER_PARAM_BY_LABEL = {
  직무: 'jobCategory',
  경력: 'careerLevel',
  '채용 유형': 'jobType',
  지역: 'location',
  '기업 규모': 'companySize',
} as const;

const API_PERIOD_BY_LABEL = {
  오늘: 'today',
  '7일': '7d',
  '30일': '30d',
  '기간 전체': 'all',
} as const;

const API_SORT_BY_LABEL = {
  추천순: 'recommend',
  최신순: 'latest',
  조회순: 'views',
} as const;

const EMPTY_LIST_STATS: JobNoticeListStats = {
  totalOpenCount: 0,
  todayNewCount: 0,
  todayNewDelta: 0,
  todayNewRate: 0,
};

type FilterLabel = keyof typeof API_FILTER_PARAM_BY_LABEL;
type Filters = Record<FilterLabel, string>;
type Bookmarks = JobNoticeBookmarkMap;
type Period = (typeof PERIODS)[number];
type SortOption = (typeof SORT_OPTIONS)[number];
type JobNoticeListStatus = 'loading' | 'success' | 'empty' | 'error';
type JobNoticeFilterParamKey =
  | 'jobCategory'
  | 'careerLevel'
  | 'jobType'
  | 'location'
  | 'companySize';

const COMPANY_SIZE_FILTER_PARAM_KEY = 'companySize' satisfies JobNoticeFilterParamKey;

const FILTER_GROUPS = [
  { label: '직무', options: JOB_NOTICE_FILTER_OPTIONS.jobCategory },
  { label: '경력', options: JOB_NOTICE_FILTER_OPTIONS.careerLevel },
  { label: '채용 유형', options: JOB_NOTICE_FILTER_OPTIONS.jobType },
  { label: '지역', options: JOB_NOTICE_FILTER_OPTIONS.location },
  { label: '기업 규모', options: JOB_NOTICE_FILTER_OPTIONS.companySize },
] as const;

const FILTER_OPTION_LABELS = {
  ...JOB_TYPE_LABELS,
  ...JOB_CATEGORY_LABELS,
  ...CAREER_LEVEL_LABELS,
} as const;


function createInitialFilters(): Filters {
  return Object.fromEntries(FILTER_GROUPS.map((group) => [group.label, DEFAULT_FILTER_VALUE])) as Filters;
}

function getJobBookmark(bookmarks: Bookmarks, job: JobNotice): boolean {
  return bookmarks[job.id] ?? job.bookmarked;
}

function getFilterOptionLabel(value: string) {
  return FILTER_OPTION_LABELS[value as keyof typeof FILTER_OPTION_LABELS] ?? value;
}

function createJobNoticeQueryParams({
  filters,
  period,
  searchQuery,
  sort,
}: {
  filters: Filters;
  period: Period;
  searchQuery: string;
  sort: SortOption;
}): JobNoticeQueryParams {
  const params: JobNoticeQueryParams = {
    period: API_PERIOD_BY_LABEL[period],
    sort: API_SORT_BY_LABEL[sort],
  };

  const keyword = searchQuery.trim();
  if (keyword) {
    params.keyword = keyword;
  }

  (Object.entries(API_FILTER_PARAM_BY_LABEL) as Array<[FilterLabel, JobNoticeFilterParamKey]>).forEach(([label, paramKey]) => {
    const value = filters[label];
    if (value !== DEFAULT_FILTER_VALUE) {
      params[paramKey] =
        paramKey === COMPANY_SIZE_FILTER_PARAM_KEY && value in JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES
          ? JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES[value as keyof typeof JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES]
          : value;
    }
  });

  return params;
}

function BannerSearch({
  value,
  onSearch,
}: {
  value: string;
  onSearch: (searchText: string) => void;
}) {
  const [searchText, setSearchText] = useState(value);

  useEffect(() => {
    setSearchText(value);
  }, [value]);

  function applySearch(value: string) {
    onSearch(value.trim());
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch(searchText);
  }

  function selectPopularSearchTag(tag: string) {
    setSearchText(tag);
    applySearch(tag);
  }

  return (
    <div className="jn-banner__search">
      <form className="jn-hero-search" onSubmit={submitSearch}>
        <span className="sr-only">채용 공고 검색</span>
        <input
          type="search"
          value={searchText}
          aria-label="채용 공고 검색어"
          placeholder="회사명, 공고명, 기술 스택으로 검색하세요"
          onChange={(event) => setSearchText(event.target.value)}
        />
        <button type="submit" aria-label="검색">
          <Search size={21} />
        </button>
      </form>

      <div className="jn-popular-tags" aria-label="인기 검색어">
        <span>인기 검색어</span>
        {POPULAR_SEARCH_TAGS.map((tag) => (
          <button
            type="button"
            key={tag}
            aria-label={`${tag} 인기 검색어로 검색`}
            onClick={() => selectPopularSearchTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: BannerStat }) {
  const { Icon } = stat;

  return (
    <article className="jn-stat-card">
      <span className={`jn-stat-card__icon ${stat.iconClassName}`}>
        <Icon size={20} />
      </span>
      <span className="jn-stat-card__label">{stat.label}</span>
      <strong className={stat.valueClassName}>{stat.value}</strong>
      <small>
        {stat.highlight && <b>{stat.highlight}</b>}
        {stat.highlight ? ` ${stat.description}` : stat.description}
      </small>
    </article>
  );
}

function BannerStats({ stats }: { stats: JobNoticeListStats }) {
  const bannerStats = createBannerStats(stats);

  return (
    <div className="jn-banner__stats" aria-label="채용 공고 통계">
      {bannerStats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

interface JobCardProps {
  job: JobNotice;
  bookmarked: boolean;
  onBookmark: (id: number) => void;
  onClick: () => void;
}

function JobCard({ job, bookmarked, onBookmark, onClick }: JobCardProps) {
  return (
    <article
      className={`jn-card${job.recommended ? ' jn-card--featured' : ''}`}
    >
      <div className="jn-card__top">
        <div className="jn-card__logo">{job.company[0]}</div>
        <div className="jn-card__company">
          <strong>{job.company}</strong>
          <span>{job.exp} · {job.employment} · {job.location}</span>
        </div>
        <button
          className={`jn-bookmark${bookmarked ? ' jn-bookmark--active' : ''}`}
          type="button"
          aria-label={`${job.title} ${bookmarked ? '북마크 해제' : '북마크'}`}
          aria-pressed={bookmarked}
          onClick={(event) => {
            event.stopPropagation();
            onBookmark(job.id);
          }}
        >
          {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>

      <h3>
        <button
          type="button"
          className="jn-card__detail-button"
          aria-label={`${job.company} ${job.title} 상세 보기`}
          onClick={onClick}
        >
          {job.title}
        </button>
      </h3>

      <div className="jn-card__tags">
        {job.tags.map((tag) => <span key={tag}>#{tag}</span>)}
      </div>

      <div className="jn-card__footer">
        {job.recommended && <span className="jn-badge jn-badge--recommend">추천</span>}
        <span className="jn-badge">{job.deadline}</span>
        <span className="jn-badge jn-badge--source">{job.source}</span>
        <span className="jn-views"><Eye size={14} /> {job.views.toLocaleString()}</span>
      </div>
    </article>
  );
}

interface FilterGroup {
  label: FilterLabel;
  options: readonly string[];
}

interface FilterBlockProps {
  group: FilterGroup;
  value: string;
  onChange: (label: FilterLabel, value: string) => void;
}

function FilterBlock({ group, value, onChange }: FilterBlockProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function selectOption(option: string) {
    onChange(group.label, option);
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <details className="jn-filter-block" ref={detailsRef}>
      <summary aria-label={`${group.label} 필터 선택, 현재 값 ${value}`}>
        <span>{group.label}</span>
        {value !== DEFAULT_FILTER_VALUE && <em>{getFilterOptionLabel(value)}</em>}
        <strong>+</strong>
      </summary>
      <div>
        {group.options.map((option) => (
          <button
            type="button"
            key={option}
            className={value === option ? 'is-active' : ''}
            aria-label={`${group.label} 필터 ${getFilterOptionLabel(option)} 선택`}
            aria-pressed={value === option}
            onClick={() => selectOption(option)}
          >
            {getFilterOptionLabel(option)}
          </button>
        ))}
      </div>
    </details>
  );
}

function PeriodSelector({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="jn-periods">
      {PERIODS.map((item) => (
        <button
          key={item}
          type="button"
          className={period === item ? 'is-active' : ''}
          aria-label={`${item} 기간으로 필터링`}
          aria-pressed={period === item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

interface SortDropdownProps {
  selected: SortOption;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (option: SortOption) => void;
}

function SortDropdown({ selected, isOpen, onToggle, onSelect }: SortDropdownProps) {
  return (
    <div className={`jn-sort${isOpen ? ' is-open' : ''}`}>
      <button type="button" aria-expanded={isOpen} aria-label={`정렬 기준: ${selected}`} onClick={onToggle}>
        {selected} <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div className="jn-sort__menu">
          {SORT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              className={selected === option ? 'is-active' : ''}
              aria-label={`${option} 정렬 선택`}
              aria-pressed={selected === option}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveFilterChips({ filters, onReset }: { filters: Filters; onReset: (label: FilterLabel) => void }) {
  const activeFilters = (Object.entries(filters) as Array<[FilterLabel, string]>).filter(([, value]) => value !== DEFAULT_FILTER_VALUE);

  if (activeFilters.length === 0) return null;

  return (
    <div className="jn-active-filters">
      {activeFilters.map(([label, value]) => (
        <button key={label} type="button" aria-label={`${label} 필터 해제`} onClick={() => onReset(label)}>
          {getFilterOptionLabel(value)} ×
        </button>
      ))}
    </div>
  );
}

export default function JobNoticeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>('기간 전체');
  const [sort, setSort] = useState<SortOption>('추천순');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobNotice | null>(null);
  const [filters, setFilters] = useState(createInitialFilters);
  const [bookmarks, setBookmarks] = useState<Bookmarks>({});
  const [bookmarkErrorMessage, setBookmarkErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const jobNoticeIdParam = searchParams.get('jobNoticeId');
  const parsedJobNoticeId = jobNoticeIdParam ? Number(jobNoticeIdParam) : null;
  const deepLinkJobNoticeId =
    parsedJobNoticeId != null && Number.isSafeInteger(parsedJobNoticeId) && parsedJobNoticeId > 0
      ? parsedJobNoticeId
      : null;

  function updateFilter(label: FilterLabel, value: string) {
    setFilters((current) => ({ ...current, [label]: value }));
  }

  async function toggleBookmark(id: number, fallbackBookmarked = false) {
    const hasAccessToken = Boolean(authSession.getAccessToken());

    if (!hasAccessToken) {
      setBookmarkErrorMessage('북마크 기능은 로그인이 필요합니다.');
      return;
    }

    const previousBookmarked = bookmarks[id] ?? fallbackBookmarked;
    const nextBookmarked = !previousBookmarked;

    try {
      setBookmarkErrorMessage('');
      const bookmarkResult = nextBookmarked
        ? await jobApi.addJobNoticeBookmark(id) as JobNoticeBookmarkResponse | null
        : await jobApi.deleteJobNoticeBookmark(id) as JobNoticeBookmarkResponse | null;

      if (nextBookmarked && !bookmarkResult) throw new Error('북마크 응답이 비어 있습니다.');

      setBookmarks((current) => ({
        ...current,
        [bookmarkResult?.jobNoticeId ?? id]: bookmarkResult?.bookmarked ?? nextBookmarked,
      }));
    } catch {
      setBookmarks((current) => ({
        ...current,
        [id]: previousBookmarked,
      }));
      setBookmarkErrorMessage('북마크 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  function resetFilter(label: FilterLabel) {
    updateFilter(label, DEFAULT_FILTER_VALUE);
  }

  function selectSort(option: SortOption) {
    setSort(option);
    setSortOpen(false);
  }

  function updateSearchQuery(nextQuery: string) {
    setSearchQuery(nextQuery);
  }

  function updatePeriod(nextPeriod: Period) {
    setPeriod(nextPeriod);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const jobNoticeQueryParams = createJobNoticeQueryParams({ filters, period, searchQuery, sort });
  const {
    data: jobNoticeListApiResponse,
    isError: isJobNoticeListError,
    isLoading: isJobNoticeListLoading,
    isFetchingNextPage: isFetchingNextJobNoticePage,
    fetchNextPage: fetchNextJobNoticePage,
    hasNextPage,
    refetch: refetchJobNoticeList,
  } = useJobNoticeList(jobNoticeQueryParams);
  const jobNoticeListPages =
    jobNoticeListApiResponse?.pages
      .map((page) => page?.data)
      .filter((page): page is NonNullable<typeof page> => page != null) ?? [];
  const jobNoticeListResponse = jobNoticeListPages[0];
  const filteredJobs = jobNoticeListPages.flatMap((page) => page.content.map(mapJobNoticeApiToViewModel));
  const listDeepLinkedJob = deepLinkJobNoticeId
    ? filteredJobs.find((job) => job.id === deepLinkJobNoticeId) ?? null
    : null;
  const shouldFetchDeepLinkedJob = deepLinkJobNoticeId != null && !listDeepLinkedJob && !isJobNoticeListLoading;
  const {
    data: deepLinkedJobDetailApiResponse,
    isError: isDeepLinkedJobDetailError,
  } = useJobNoticeDetail(deepLinkJobNoticeId, { enabled: shouldFetchDeepLinkedJob });
  const deepLinkedDetailJob =
    deepLinkedJobDetailApiResponse?.data && deepLinkedJobDetailApiResponse.data.jobNoticeId === deepLinkJobNoticeId
      ? mapJobNoticeApiToViewModel(deepLinkedJobDetailApiResponse.data)
      : null;
  const resultTotalItems = jobNoticeListResponse?.totalElements ?? 0;
  const listStats = jobNoticeListResponse?.stats ?? EMPTY_LIST_STATS;
  const hasMoreJobs = hasNextPage ?? false;
  const listStatus: JobNoticeListStatus = isJobNoticeListLoading && filteredJobs.length === 0
    ? 'loading'
    : isJobNoticeListError && filteredJobs.length === 0
      ? 'error'
      : filteredJobs.length > 0
        ? 'success'
        : 'empty';

  useEffect(() => {
    const allLoadedJobs = jobNoticeListPages.flatMap((page) => page.content);

    if (allLoadedJobs.length === 0) return;

    setBookmarks((current) => {
      const next = { ...current };
      allLoadedJobs.forEach((job) => {
        next[job.jobNoticeId] = current[job.jobNoticeId] ?? job.bookmarked;
      });
      return next;
    });
  }, [jobNoticeListPages]);

  useEffect(() => {
    if (!jobNoticeIdParam) return;

    if (deepLinkJobNoticeId == null) {
      setBookmarkErrorMessage('요청한 공고 주소가 올바르지 않습니다.');
      return;
    }

    if (selectedJob?.id === deepLinkJobNoticeId) return;

    const nextSelectedJob = listDeepLinkedJob ?? deepLinkedDetailJob;
    if (nextSelectedJob) {
      setBookmarkErrorMessage('');
      setSelectedJob(nextSelectedJob);
      setBookmarks((current) => ({
        ...current,
        [nextSelectedJob.id]: current[nextSelectedJob.id] ?? nextSelectedJob.bookmarked,
      }));
      return;
    }

    if (isDeepLinkedJobDetailError) {
      setBookmarkErrorMessage('요청한 채용 공고를 찾을 수 없습니다.');
    }
  }, [
    deepLinkJobNoticeId,
    deepLinkedDetailJob,
    isDeepLinkedJobDetailError,
    jobNoticeIdParam,
    listDeepLinkedJob,
    selectedJob?.id,
  ]);

  function closeSelectedJob() {
    setSelectedJob(null);

    if (!jobNoticeIdParam) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('jobNoticeId');
    setSearchParams(nextSearchParams, { replace: true });
  }

  function retryJobNoticeList() {
    void refetchJobNoticeList();
  }

  function loadMoreJobs() {
    if (!hasMoreJobs || isFetchingNextJobNoticePage) return;

    void fetchNextJobNoticePage();
  }

  function resetSearchConditions() {
    setSearchQuery('');
    setFilters(createInitialFilters());
    setPeriod('기간 전체');
  }

  return (
    <div className="jn">
      <section className="jn-banner">
        <BannerSearch value={searchQuery} onSearch={updateSearchQuery} />
        <BannerStats stats={listStats} />
      </section>

      <div className="jn-layout">
        <aside className="jn-filter-panel">
          {FILTER_GROUPS.map((group) => (
            <FilterBlock
              key={group.label}
              group={group}
              value={filters[group.label]}
              onChange={updateFilter}
            />
          ))}
        </aside>

        <main className="jn-results">
          <div className="jn-results__head">
            <div>
              <span>해당 공고 <b>{resultTotalItems.toLocaleString()}</b>개</span>
              <ActiveFilterChips filters={filters} onReset={resetFilter} />
            </div>
            <div className="jn-results__tools">
              <PeriodSelector period={period} onChange={updatePeriod} />
              <SortDropdown
                selected={sort}
                isOpen={sortOpen}
                onToggle={() => setSortOpen((open) => !open)}
                onSelect={selectSort}
              />
            </div>
          </div>

          {bookmarkErrorMessage && (
            <div className="jn-feedback jn-feedback--error" role="alert">
              <span>{bookmarkErrorMessage}</span>
              {bookmarkErrorMessage.includes('로그인') && (
                <a href="/auth/login">로그인</a>
              )}
            </div>
          )}

          {listStatus === 'success' && (
            <>
              <div className="jn-job-grid">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    bookmarked={getJobBookmark(bookmarks, job)}
                    onBookmark={(id) => toggleBookmark(id, getJobBookmark(bookmarks, job))}
                    onClick={() => setSelectedJob(job)}
                  />
                ))}
              </div>
              {hasMoreJobs && (
                <button
                  type="button"
                  className="jn-load-more"
                  onClick={loadMoreJobs}
                  disabled={isFetchingNextJobNoticePage}
                >
                  {isFetchingNextJobNoticePage
                    ? '불러오는 중...'
                    : `더 보기 (${filteredJobs.length.toLocaleString()} / ${resultTotalItems.toLocaleString()}개)`}
                </button>
              )}
            </>
          )}

          {listStatus === 'loading' && (
            <div className="jn-empty" role="status" aria-live="polite">
              <FileText size={18} />
              <strong>채용 공고를 불러오는 중입니다.</strong>
              <span>조건에 맞는 공고를 확인하고 있습니다.</span>
            </div>
          )}

          {listStatus === 'empty' && (
            <div className="jn-empty" role="status" aria-live="polite">
              <Filter size={18} />
              <strong>조건에 맞는 공고가 없습니다.</strong>
              <span>필터를 줄이거나 검색어를 다시 입력해 주세요.</span>
              <button type="button" onClick={resetSearchConditions}>조건 초기화</button>
            </div>
          )}
          {listStatus === 'error' && (
            <div className="jn-empty" role="alert">
              <Filter size={18} />
              <strong>채용 공고 목록을 불러올 수 없습니다.</strong>
              <span>잠시 후 다시 시도해 주세요.</span>
              <button type="button" onClick={retryJobNoticeList}>다시 시도</button>
            </div>
          )}
        </main>
      </div>

      <button type="button" className="jn-scroll-top" aria-label="위로 이동" onClick={scrollToTop}>
        <ArrowUp size={18} />
      </button>

      <JobNoticeDetail
        job={selectedJob}
        isOpen={Boolean(selectedJob)}
        bookmarked={selectedJob ? getJobBookmark(bookmarks, selectedJob) : false}
        onClose={closeSelectedJob}
        onBookmark={(id) =>
          toggleBookmark(id, selectedJob ? getJobBookmark(bookmarks, selectedJob) : false)
        }
      />
    </div>
  );
}
