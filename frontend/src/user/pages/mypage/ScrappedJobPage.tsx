import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, Bookmark } from "lucide-react";
import JobNoticeDetail from "@/user/pages/jobNotice/JobNoticeDetail";
import { mockScrapJobs } from "@/user/mocks/dashboardMock";
import type { ScrapJob } from "@/user/types/dashboard";
import "./MyPage.css";

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
    title: string;
    company: string;
    location: string;
    deadline: string;
    exp: string;
    employment: string;
    source: string;
    jobType: string;
    companySize: string;
    careerLevel: ScrapJob["careerLevel"];
    noticeStatus: ScrapJob["noticeStatus"];
    bookmarked: boolean;
    stacks: string[];
    tags: string[];
};

const createJobNoticeViewModel = (job: ScrapJob): JobNoticeViewModel => ({
    id: job.jobNoticeId,
    title: job.title,
    company: job.companyName,
    location: job.location,
    deadline: job.deadline,

    exp: CAREER_LEVEL_LABELS[job.careerLevel] ?? "무관",
    employment: job.employment ?? "-",
    source: job.source ?? "-",
    jobType: job.jobType ?? "-",
    companySize: job.companySize ?? "-",

    careerLevel: job.careerLevel,
    noticeStatus: job.noticeStatus,
    bookmarked: true,

    stacks: [],
    tags: [],
});

function ScrappedJobPage() {
    const [selectedJob, setSelectedJob] = useState<JobNoticeViewModel | null>(null);

    const scrappedJobs: ScrapJob[] = mockScrapJobs;

    function closeDetail() {
        setSelectedJob(null);
    }

    function toggleBookmark() {
        alert("스크랩 해제 기능은 준비 중입니다.");
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
                        <p>
                            내가 저장한 채용공고를 한눈에 확인하고 관리할 수 있어요.
                        </p>
                    </div>

                    <div className="cw-scrap-search">
                        <input
                            type="text"
                            placeholder="공고명 또는 회사명 검색"
                            disabled
                        />
                        {/* TODO: Phase 3 - 스크랩 공고 검색 기능 구현 */}
                        <Search size={18} />
                    </div>
                </div>

                <div className="cw-scrap-toolbar">
                    <span>스크랩한 공고 {scrappedJobs.length}개</span>
                    {/* TODO: Phase 3 - 최신순 정렬 기능 구현 */}
                    <button type="button" disabled aria-disabled="true">
                        최근 스크랩순
                    </button>
                </div>

                <div className="cw-scrap-grid">
                    {scrappedJobs.map((job) => (
                        <div className="cw-scrap-card" key={job.bookmarkId}>
                            <div className="cw-scrap-card-top">
                                <div className="cw-scrap-logo">
                                    {job.companyName.slice(0, 1)}
                                </div>

                                <div className="cw-scrap-company">
                                    <strong>{job.companyName}</strong>
                                    <span>
                                        {CAREER_LEVEL_LABELS[job.careerLevel]} · {job.location} ·{" "}
                                        {NOTICE_STATUS_LABELS[job.noticeStatus]}
                                    </span>
                                </div>

                                <button type="button" className="cw-scrap-bookmark">
                                    <Bookmark size={18} />
                                </button>
                            </div>

                            <h3>{job.title}</h3>

                            <p className="cw-scrap-keywords">
                                등록일{" "}
                                {new Date(job.createdAt).toLocaleDateString("ko-KR")}
                            </p>

                            <div className="cw-scrap-card-bottom">
                                <span>{job.deadline}</span>

                                <button
                                    type="button"
                                    className="cw-job-detail-button"
                                    onClick={() =>
                                        setSelectedJob(createJobNoticeViewModel(job))
                                    }
                                >
                                    상세보기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <JobNoticeDetail
                job={selectedJob}
                isOpen={Boolean(selectedJob)}
                bookmarked={Boolean(selectedJob)}
                onClose={closeDetail}
                onBookmark={toggleBookmark}
            />
        </div>
    );
}

export default ScrappedJobPage;