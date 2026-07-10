import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, FileText, Filter } from 'lucide-react';
import JobNoticeDetail from './JobNoticeDetail';
import JobNoticeCard from './JobNoticeCard';
import { JobNoticeBanner, JobNoticeFilters, JobNoticeResultToolbar } from './JobNoticeListControls';
import {
  createInitialFilters,
  createJobNoticeQueryParams,
  getJobBookmark,
  type Bookmarks,
  type FilterLabel,
  type Filters,
  type JobNoticeListStatus,
  type Period,
  type SortOption,
} from './jobNoticeListConfig';
import { mapJobNoticeApiToViewModel, type JobNotice, type JobNoticeBookmarkResponse, type JobNoticeListStats } from '../../../types/user/jobNotice';
import { jobApi } from '../../../api/user/jobApi';
import { useJobNoticeDetail } from '../../../hooks/user/jobNotice/useJobNoticeDetail';
import { useJobNoticeList } from '../../../hooks/user/jobNotice/useJobNoticeList';
import { invalidateBookmarkQueries } from '../../../hooks/user/bookmark/bookmarkQueryCache';
import { authSession } from '../../../utils/user/member/authSession';
import '@/styles/user/jobNotice/JobNoticeListPage.css';

const EMPTY_LIST_STATS: JobNoticeListStats = {
  totalOpenCount: 0,
  todayNewCount: 0,
  todayNewDelta: 0,
  todayNewRate: 0,
};

export default function JobNoticeListPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>('기간 전체');
  const [sort, setSort] = useState<SortOption>('추천순');
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobNotice | null>(null);
  const [filters, setFilters] = useState<Filters>(createInitialFilters);
  const [bookmarks, setBookmarks] = useState<Bookmarks>({});
  const [bookmarkErrorMessage, setBookmarkErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const jobNoticeIdParam = searchParams.get('jobNoticeId');
  const parsedJobNoticeId = jobNoticeIdParam ? Number(jobNoticeIdParam) : null;
  const deepLinkJobNoticeId =
    parsedJobNoticeId != null && Number.isSafeInteger(parsedJobNoticeId) && parsedJobNoticeId > 0
      ? parsedJobNoticeId
      : null;

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

  const jobNoticeListPages = useMemo(
    () =>
      jobNoticeListApiResponse?.pages
        .map((page) => page?.data)
        .filter((page): page is NonNullable<typeof page> => page != null) ?? [],
    [jobNoticeListApiResponse?.pages]
  );
  const jobNoticeListResponse = jobNoticeListPages[0];
  const filteredJobs = useMemo(
    () => jobNoticeListPages.flatMap((page) => page.content.map(mapJobNoticeApiToViewModel)),
    [jobNoticeListPages]
  );
  const listDeepLinkedJob = useMemo(
    () => (deepLinkJobNoticeId ? filteredJobs.find((job) => job.id === deepLinkJobNoticeId) ?? null : null),
    [deepLinkJobNoticeId, filteredJobs]
  );
  const shouldFetchDeepLinkedJob = deepLinkJobNoticeId != null && !listDeepLinkedJob && !isJobNoticeListLoading;
  const { data: deepLinkedJobDetailApiResponse, isError: isDeepLinkedJobDetailError } = useJobNoticeDetail(deepLinkJobNoticeId, { enabled: shouldFetchDeepLinkedJob });
  const deepLinkedDetailJob = useMemo(
    () => (
      deepLinkedJobDetailApiResponse?.data && deepLinkedJobDetailApiResponse.data.jobNoticeId === deepLinkJobNoticeId
        ? mapJobNoticeApiToViewModel(deepLinkedJobDetailApiResponse.data)
        : null
    ),
    [deepLinkJobNoticeId, deepLinkedJobDetailApiResponse?.data]
  );

  const resultTotalItems = jobNoticeListResponse?.totalElements ?? 0;
  const listStats = jobNoticeListResponse?.stats ?? EMPTY_LIST_STATS;
  const hasMoreJobs = hasNextPage ?? false;
  const listStatus: JobNoticeListStatus =
    isJobNoticeListLoading && filteredJobs.length === 0
      ? 'loading'
      : isJobNoticeListError && filteredJobs.length === 0
        ? 'error'
        : filteredJobs.length > 0
          ? 'success'
          : 'empty';

  function updateFilter(label: FilterLabel, value: string) {
    setFilters((current) => ({ ...current, [label]: value }));
  }

  async function toggleBookmark(id: number, fallbackBookmarked = false) {
    if (!authSession.getAccessToken()) {
      setBookmarkErrorMessage('북마크 기능은 로그인이 필요합니다.');
      return;
    }

    const previousBookmarked = bookmarks[id] ?? fallbackBookmarked;
    const nextBookmarked = !previousBookmarked;

    try {
      setBookmarkErrorMessage('');
      const bookmarkResult = nextBookmarked
        ? (await jobApi.addJobNoticeBookmark(id) as JobNoticeBookmarkResponse | null)
        : (await jobApi.deleteJobNoticeBookmark(id) as JobNoticeBookmarkResponse | null);

      if (nextBookmarked && !bookmarkResult) {
        throw new Error('bookmark response is empty');
      }

      setBookmarks((current) => ({
        ...current,
        [bookmarkResult?.jobNoticeId ?? id]: bookmarkResult?.bookmarked ?? nextBookmarked,
      }));
      void invalidateBookmarkQueries(queryClient);
    } catch {
      setBookmarks((current) => ({
        ...current,
        [id]: previousBookmarked,
      }));
      setBookmarkErrorMessage('북마크 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  function resetFilter(label: FilterLabel) {
    updateFilter(label, 'ALL');
  }

  function selectSort(option: SortOption) {
    setSort(option);
    setSortOpen(false);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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

  useEffect(() => {
    const allLoadedJobs = jobNoticeListPages.flatMap((page) => page.content);
    if (allLoadedJobs.length === 0) return;

    setBookmarks((current) => {
      const next = { ...current };
      let hasChanges = false;

      allLoadedJobs.forEach((job) => {
        if (!(job.jobNoticeId in current)) {
          next[job.jobNoticeId] = job.bookmarked;
          hasChanges = true;
        }
      });

      return hasChanges ? next : current;
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
      setBookmarks((current) => {
        if (nextSelectedJob.id in current) return current;
        return { ...current, [nextSelectedJob.id]: nextSelectedJob.bookmarked };
      });
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

  return (
    <div className="jn">
      <JobNoticeBanner searchQuery={searchQuery} onSearch={setSearchQuery} stats={listStats} />

      <div className="jn-layout">
        <JobNoticeFilters filters={filters} onChange={updateFilter} />

        <main className="jn-results">
          <JobNoticeResultToolbar
            resultTotalItems={resultTotalItems}
            filters={filters}
            onReset={resetFilter}
            period={period}
            onPeriodChange={setPeriod}
            sort={sort}
            sortOpen={sortOpen}
            onSortToggle={() => setSortOpen((open) => !open)}
            onSortSelect={selectSort}
          />

          {bookmarkErrorMessage && (
            <div className="jn-feedback jn-feedback--error" role="alert">
              <span>{bookmarkErrorMessage}</span>
              {bookmarkErrorMessage.includes('로그인') && <a href="/auth/login">로그인</a>}
            </div>
          )}

          {listStatus === 'success' && (
            <>
              <div className="jn-job-grid">
                {filteredJobs.map((job) => (
                  <JobNoticeCard
                    key={job.id}
                    job={job}
                    bookmarked={getJobBookmark(bookmarks, job)}
                    onBookmark={(id) => toggleBookmark(id, getJobBookmark(bookmarks, job))}
                    onClick={() => setSelectedJob(job)}
                  />
                ))}
              </div>
              {hasMoreJobs && (
                <button type="button" className="jn-load-more" onClick={loadMoreJobs} disabled={isFetchingNextJobNoticePage}>
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
        onBookmark={(id) => toggleBookmark(id, selectedJob ? getJobBookmark(bookmarks, selectedJob) : false)}
      />
    </div>
  );
}
