import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Eye,
  FileText,
  Filter,
  Flame,
  Search,
} from 'lucide-react';
import JobNoticeDetail from './JobNoticeDetail';
import {
  mapJobNoticeApiToViewModel,
  type JobNotice,
  type JobNoticeBookmarkMap,
  type JobNoticeListStats,
  type JobNoticeQueryParams,
} from './JobNoticeTypes';
import { useJobNoticeList } from '../../hooks/jobNotice/useJobNoticeList';
import './styles/JobNoticeListPage.css';

const FILTER_GROUPS = [
  { label: '직무', options: ['전체', '백엔드', '프론트엔드', '데이터', 'DevOps'] },
  { label: '경력', options: ['전체', '신입', '1~3년', '3~5년', '5년 이상'] },
  { label: '채용 유형', options: ['전체', '정규직', '인턴', '계약직'] },
  { label: '지역', options: ['전체', '서울', '경기', '원격'] },
  { label: '기업 규모', options: ['전체', '스타트업', '중견', '대기업'] },
] as const;

const PERIODS = ['오늘', '7일', '30일', '기간 전체'] as const;
const SORT_OPTIONS = ['추천순', '최신순', '조회순'] as const;
const DEFAULT_FILTER_VALUE = '전체';
const POPULAR_SEARCH_TAGS = ['백엔드', '프론트엔드', 'Java', 'React', 'Spring Boot', 'AWS', 'Python'];

const MOCK_PAGE = 1;
const MOCK_PAGE_SIZE = 18;

const API_FILTER_PARAM_BY_LABEL = {
  직무: 'jobType',
  경력: 'experience',
  '채용 유형': 'employmentType',
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
type JobNoticeListStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';
type JobNoticeFilterParamKey =
  | 'jobType'
  | 'experience'
  | 'employmentType'
  | 'location'
  | 'companySize';

interface BannerStat {
  label: string;
  value: string;
  description: string;
  Icon: LucideIcon;
  iconClassName: string;
  highlight?: string;
  valueClassName?: string;
}

function createBannerStats(stats: JobNoticeListStats): BannerStat[] {
  return [
    {
      label: '전체 공고',
      value: stats.totalOpenCount.toLocaleString(),
      description: `+${stats.todayNewCount.toLocaleString()} 오늘`,
      Icon: FileText,
      iconClassName: 'jn-stat-card__icon--blue',
    },
    {
      label: '오늘 신규 공고',
      value: stats.todayNewCount.toLocaleString(),
      description: `(${stats.todayNewRate.toLocaleString()}%)`,
      highlight: `+${stats.todayNewDelta.toLocaleString()}`,
      Icon: Flame,
      iconClassName: 'jn-stat-card__icon--pink',
      valueClassName: 'jn-stat-card__value--pink',
    },
  ];
}

const JOBS: JobNotice[] = [
  {
    id: 1,
    company: '제너러티브랩',
    title: '제너러티브랩 공개채용 [학력, 경력, 스펙 무관]',
    jobType: '백엔드',
    exp: '경력무관',
    employment: '전환형인턴',
    location: '서울',
    companySize: '스타트업',
    salary: '협의',
    deadline: '상시',
    postedAt: '2026-05-28',
    tags: ['프롬프트 엔지니어', '개발', 'AI 컨설턴트'],
    source: '직행수집',
    recommended: true,
    recommendScore: 98,
    views: 1756,
    bookmarked: false,
  },
  {
    id: 2,
    company: '리빌더에이아이',
    title: '[리빌더AI] QA 엔지니어',
    jobType: '데이터',
    exp: '3~20년',
    employment: '정규직',
    location: '경기',
    companySize: '스타트업',
    salary: '협의',
    deadline: '상시',
    postedAt: '2026-05-27',
    tags: ['테스트자동화', '이슈트래킹', 'QA프로세스'],
    source: '그룹바이',
    recommended: false,
    recommendScore: 86,
    views: 6,
    bookmarked: false,
  },
  {
    id: 3,
    company: '코코네',
    title: '[Cocone Internship] AI Engineer',
    jobType: '데이터',
    exp: '신입',
    employment: '인턴',
    location: '서울',
    companySize: '중견',
    salary: '협의',
    deadline: '상시',
    postedAt: '2026-05-24',
    tags: ['AI어시스턴트', '아바타메타버스', 'AI모델연구'],
    source: '그룹바이',
    recommended: false,
    recommendScore: 82,
    views: 102,
    bookmarked: false,
  },
  {
    id: 4,
    company: '비전스페이스',
    title: '산업용 로봇 AI 자율주행 & ROS & RMS 담당',
    jobType: 'DevOps',
    exp: '신입',
    employment: '정규직',
    location: '서울',
    companySize: '스타트업',
    salary: '협의',
    deadline: '상시',
    postedAt: '2026-05-20',
    tags: ['자율주행설계', '로봇'],
    source: '그룹바이',
    recommended: false,
    recommendScore: 78,
    views: 494,
    bookmarked: false,
  },
  {
    id: 5,
    company: '어센트 AI',
    title: '인프라 엔지니어 (IDC)',
    jobType: 'DevOps',
    exp: '4~10년',
    employment: '정규직',
    location: '서울',
    companySize: '중견',
    salary: '협의',
    deadline: '상시',
    postedAt: '2026-05-12',
    tags: ['인프라엔지니어', '쿠버네티스', '오픈소스운영'],
    source: '그룹바이',
    recommended: false,
    recommendScore: 84,
    views: 19,
    bookmarked: false,
  },
  {
    id: 6,
    company: '(주)무아스',
    title: '[무아스] 인플루언서 공동구매 MD 채용 공고',
    jobType: '프론트엔드',
    exp: '2~20년',
    employment: '정규직',
    location: '서울',
    companySize: '중견',
    salary: '협의',
    deadline: '상시',
    postedAt: '2026-04-28',
    tags: ['공동구매', '커머스', '인플루언서'],
    source: '그룹바이',
    recommended: false,
    recommendScore: 72,
    views: 1,
    bookmarked: false,
  },
];

function createInitialFilters(): Filters {
  return Object.fromEntries(FILTER_GROUPS.map((group) => [group.label, DEFAULT_FILTER_VALUE])) as Filters;
}

function getJobBookmark(bookmarks: Bookmarks, job: JobNotice): boolean {
  return bookmarks[job.id] ?? job.bookmarked;
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
    page: MOCK_PAGE,
    size: MOCK_PAGE_SIZE,
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
      params[paramKey] = value;
    }
  });

  return params;
}

function BannerSearch({ onSearch }: { onSearch: (searchText: string) => void }) {
  const [searchText, setSearchText] = useState('');

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
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest('button')) return;

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
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
          aria-label={bookmarked ? '북마크 해제' : '북마크'}
          onClick={(event) => {
            event.stopPropagation();
            onBookmark(job.id);
          }}
        >
          {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>

      <h3>{job.title}</h3>

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
      <summary>
        <span>{group.label}</span>
        {value !== DEFAULT_FILTER_VALUE && <em>{value}</em>}
        <strong>+</strong>
      </summary>
      <div>
        {group.options.map((option) => (
          <button
            type="button"
            key={option}
            className={value === option ? 'is-active' : ''}
            onClick={() => selectOption(option)}
          >
            {option}
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
          {value} ×
        </button>
      ))}
    </div>
  );
}

export default function JobNoticeListPage() {
  const [period, setPeriod] = useState<Period>('기간 전체');
  const [sort, setSort] = useState<SortOption>('추천순');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobNotice | null>(null);
  const [filters, setFilters] = useState(createInitialFilters);
  const [bookmarks, setBookmarks] = useState<Bookmarks>({});
  const [searchQuery, setSearchQuery] = useState('');

  function updateFilter(label: FilterLabel, value: string) {
    setFilters((current) => ({ ...current, [label]: value }));
  }

  function toggleBookmark(id: number, fallbackBookmarked = false) {
    setBookmarks((current) => {
      const currentValue = current[id] ?? fallbackBookmarked;
      return { ...current, [id]: !currentValue };
    });
  }

  function resetFilter(label: FilterLabel) {
    updateFilter(label, DEFAULT_FILTER_VALUE);
  }

  function selectSort(option: SortOption) {
    setSort(option);
    setSortOpen(false);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const jobNoticeQueryParams = createJobNoticeQueryParams({ filters, period, searchQuery, sort });
  const {
    data: jobNoticeListApiResponse,
    isError: isJobNoticeListError,
    isLoading: isJobNoticeListLoading,
    refetch: refetchJobNoticeList,
  } = useJobNoticeList(jobNoticeQueryParams);
  const jobNoticeListResponse = jobNoticeListApiResponse?.data;
  const filteredJobs = jobNoticeListResponse?.items.map(mapJobNoticeApiToViewModel) ?? [];
  const resultTotalItems = jobNoticeListResponse?.totalItems ?? 0;
  const listStats = jobNoticeListResponse?.stats ?? EMPTY_LIST_STATS;
  const listStatus: JobNoticeListStatus = isJobNoticeListLoading
    ? 'loading'
    : isJobNoticeListError
      ? 'error'
      : filteredJobs.length > 0
        ? 'success'
        : 'empty';

  useEffect(() => {
    if (!jobNoticeListResponse?.items.length) return;

    setBookmarks((current) => {
      const next = { ...current };
      jobNoticeListResponse.items.forEach((job) => {
        next[job.id] = current[job.id] ?? job.bookmarked;
      });
      return next;
    });
  }, [jobNoticeListResponse?.items]);

  function retryJobNoticeList() {
    void refetchJobNoticeList();
  }

  return (
    <div className="jn">
      <section className="jn-banner">
        <BannerSearch onSearch={setSearchQuery} />
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
              <PeriodSelector period={period} onChange={setPeriod} />
              <SortDropdown
                selected={sort}
                isOpen={sortOpen}
                onToggle={() => setSortOpen((open) => !open)}
                onSelect={selectSort}
              />
            </div>
          </div>

          {listStatus === 'success' && (
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
          )}

          {listStatus === 'loading' && (
            <div className="jn-empty" role="status" aria-live="polite">
              <FileText size={18} />
              <strong>채용 공고를 불러오는 중입니다.</strong>
              <span>조건에 맞는 공고를 확인하고 있습니다.</span>
            </div>
          )}

          {listStatus === 'empty' && (
            <div className="jn-empty">
              <Filter size={18} />
              <strong>조건에 맞는 공고가 없습니다.</strong>
              <span>필터를 줄이거나 검색어를 다시 입력해 주세요.</span>
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
        onClose={() => setSelectedJob(null)}
        onBookmark={(id) =>
          toggleBookmark(id, selectedJob ? getJobBookmark(bookmarks, selectedJob) : false)
        }
      />
    </div>
  );
}
