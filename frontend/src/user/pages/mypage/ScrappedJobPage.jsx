import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, Bookmark } from "lucide-react";
import JobNoticeDetail from "@/user/pages/jobNotice/JobNoticeDetail";
import { mockScrapJobs } from "@/user/mocks/dashboardMock";
import "./MyPage.css";

function ScrappedJobPage() {
    const [selectedJob, setSelectedJob] = useState(null);

    const scrappedJobs = mockScrapJobs;

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
                    <NavLink to="/mypage/favorites" className="is-active">
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
                        <input type="text" placeholder="공고명 또는 회사명 검색" />
                        <Search size={18} />
                    </div>
                </div>

                <div className="cw-scrap-toolbar">
                    <span>스크랩한 공고 {scrappedJobs.length}개</span>
                    <button type="button">최근 스크랩순</button>
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
                                        {job.careerLevel} · {job.location} ·{" "}
                                        {job.noticeStatus}
                                    </span>
                                </div>

                                <button type="button" className="cw-scrap-bookmark">
                                    <Bookmark size={18} />
                                </button>
                            </div>

                            <h3>{job.title}</h3>

                            <p className="cw-scrap-keywords">
                                등록일 {job.createdAt}
                            </p>

                            <div className="cw-scrap-card-bottom">
                                <span>{job.deadline}</span>

                                <button
                                    type="button"
                                    className="cw-job-detail-button"
                                    onClick={() => setSelectedJob(job)}
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