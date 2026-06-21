import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, Bookmark } from "lucide-react";
import JobNoticeDetail from "@/pages/user/jobNotice/JobNoticeDetail";
import { deleteDashboardBookmark } from "@/api/user/dashboard";
import { useDashboardBookmarks } from "@/hooks/user/dashboard";
import type { ScrapJob } from "@/types/user/dashboard";
import "@/styles/user/mypage/MyPage.css";

const CAREER_LEVEL_LABELS: Record<ScrapJob["careerLevel"], string> = {
  JUNIOR: "신입",
  SENIOR: "경력",
  ANY: "무관",
};

const NOTICE_STATUS_LABELS: Record<ScrapJob["noticeStatus"], string> = {
  ACTIVE: "채용중",
  CLOSED: "마감",
};

type JobNoticeViewModel = {
  id: number;
  bookmarkId: number;
  title: string;
  company: string;
  location: string;
  deadline: string;
  exp: string;
  employment: string;
  source: string;
  jobType: string;
  jobCategory: string;
  companySize: string;
  careerLevel: ScrapJob["careerLevel"];
  noticeStatus: ScrapJob["noticeStatus"];
  bookmarked: boolean;
  stacks: string[];
  tags: string[];
  postedAt: string;
  recommended: boolean;
  recommendScore: number;
  views: number;
};

const createJobNoticeViewModel = (job: ScrapJob): JobNoticeViewModel => ({
  id: job.jobNoticeId,
  bookmarkId: job.bookmarkId,
  title: job.title,
  company: job.companyName,
  location: job.location,
  deadline: job.deadline,
  exp: CAREER_LEVEL_LABELS[job.careerLevel] ?? "무관",
  employment: "-",
  source: "-",
  jobType: "-",
  jobCategory: "-",
  companySize: "-",
  careerLevel: job.careerLevel,
  noticeStatus: job.noticeStatus,
  bookmarked: true,
  stacks: [],
  tags: [],
  postedAt: job.createdAt,
  recommended: false,
  recommendScore: 0,
  views: 0,
});

function ScrappedJobPage() {
  const [selectedJob, setSelectedJob] = useState<JobNoticeViewModel | null>(
    null,
  );
  const [searchKeyword, setSearchKeyword] = useState("");

  const keyword = searchKeyword.trim();

  const { data: scrapJobPage, refetch } = useDashboardBookmarks({
    keyword,
    page: 0,
    size: 10,
  });

  const scrappedJobs = scrapJobPage?.items ?? [];

  const sortedScrapJobs = useMemo(() => {
    return [...scrappedJobs].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [scrappedJobs]);

  const hasScrapJobs = scrappedJobs.length > 0;
  const hasSearchResult = sortedScrapJobs.length > 0;

  function closeDetail() {
    setSelectedJob(null);
  }

  async function handleUnscrap(bookmarkId: number) {
    const confirmed = window.confirm("스크랩을 해제하시겠습니까?");
    if (!confirmed) return;

    try {
      await deleteDashboardBookmark(bookmarkId);
      await refetch();
      if (selectedJob?.bookmarkId === bookmarkId) {
        setSelectedJob(null);
      }
      alert("스크랩이 해제되었습니다.");
    } catch {
      alert("스크랩 해제에 실패했습니다.");
    }
  }

  return (
    <div className="cw-mypage-layout">
      <aside className="cw-mypage-sidebar">
        <strong>마이페이지</strong>

        <nav>
          <NavLink to="/mypage" end>
            내 정보 관리
          </NavLink>
          <NavLink
            to="/mypage/favorites"
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            스크랩 공고
          </NavLink>
          <NavLink to="/mypage/subscription">AI 서비스</NavLink>
          <NavLink to="/mypage/payment-history">구독/결제 내역</NavLink>
        </nav>
      </aside>

      <section className="cw-scrap-page">
        <div className="cw-scrap-header">
          <div>
            <span className="cw-account-badge">SAVED JOBS</span>
            <h2>스크랩 공고</h2>
            <p>내가 저장한 채용공고를 한눈에 확인하고 관리할 수 있어요.</p>
          </div>

          <div className="cw-scrap-search">
            <input
              type="text"
              placeholder="공고명 또는 회사명 검색"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
            <Search size={18} />
          </div>
        </div>

        <div className="cw-scrap-toolbar">
          <span>
            스크랩한 공고 {scrappedJobs.length}개
            {searchKeyword.trim() &&
              ` · 검색 결과 ${sortedScrapJobs.length}개`}
          </span>

          <button type="button" disabled aria-disabled="true">
            최신순
          </button>
        </div>

        {!hasScrapJobs ? (
          <div className="cw-state-box">아직 스크랩한 채용공고가 없습니다.</div>
        ) : !hasSearchResult ? (
          <div className="cw-state-box">
            검색 조건에 맞는 스크랩 공고가 없습니다.
          </div>
        ) : (
          <div className="cw-scrap-grid">
            {sortedScrapJobs.map((job) => {
              const isDeleted = job.deleted;
              const isClosed = job.noticeStatus === "CLOSED";

              return (
                <div
                  className={`cw-scrap-card ${isClosed ? "is-closed" : ""}`}
                  key={job.bookmarkId}
                >
                  <div className="cw-scrap-card-top">
                    <div className="cw-scrap-logo">
                      {job.companyName.slice(0, 1)}
                    </div>

                    <div className="cw-scrap-company">
                      <strong>{job.companyName}</strong>
                      <span>
                        {CAREER_LEVEL_LABELS[job.careerLevel]} · {job.location}{" "}
                        · {NOTICE_STATUS_LABELS[job.noticeStatus]}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="cw-scrap-bookmark"
                      aria-label="스크랩 해제"
                      onClick={() => handleUnscrap(job.bookmarkId)}
                    >
                      <Bookmark size={18} />
                    </button>
                  </div>

                  <h3>{job.title}</h3>

                  <p className="cw-scrap-keywords">
                    등록일 {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                  </p>

                  {isDeleted && (
                    <p className="cw-scrap-closed-message">
                      삭제된 공고입니다.
                    </p>
                  )}

                  {!isDeleted && isClosed && (
                    <p className="cw-scrap-closed-message">
                      마감된 공고입니다.
                    </p>
                  )}

                  <div className="cw-scrap-card-bottom">
                    <span>{job.deadline}</span>

                    <button
                      type="button"
                      className="cw-job-detail-button"
                      onClick={() => {
                        if (job.deleted) {
                          alert("삭제된 공고입니다.");
                          return;
                        }

                        setSelectedJob(createJobNoticeViewModel(job));
                      }}
                    >
                      상세보기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedJob && (
        <JobNoticeDetail
          job={selectedJob}
          isOpen={true}
          bookmarked={selectedJob.bookmarked}
          onClose={closeDetail}
          onBookmark={() => handleUnscrap(selectedJob.bookmarkId)}
        />
      )}
    </div>
  );
}
export default ScrappedJobPage;
