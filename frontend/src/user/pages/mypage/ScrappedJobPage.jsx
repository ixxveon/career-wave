import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, Bookmark } from "lucide-react";
import JobNoticeDetail from "@/user/pages/jobNotice/JobNoticeDetail";
import "./MyPage.css";

function ScrappedJobPage() {
    const [selectedJob, setSelectedJob] = useState(null);

    const scrappedJobs = [
        {
            id: 1,
            logo: "제",
            company: "제너러티브랩",
            title: "제너러티브랩 공개채용 [학력, 경력, 스펙 무관]",
            jobType: "백엔드",
            exp: "경력무관",
            employment: "전환형인턴",
            location: "서울",
            companySize: "스타트업",
            salary: "협의",
            deadline: "상시",
            postedAt: "2026-05-28",
            tags: ["프롬프트 엔지니어", "개발", "AI 컨설턴트"],
            source: "직행수집",
            recommended: true,
            recommendScore: 98,
            views: 1756,
            bookmarked: true,
        },
        {
            id: 2,
            logo: "리",
            company: "리빌더에이아이",
            title: "[리빌더AI] QA 엔지니어",
            jobType: "데이터",
            exp: "3~20년",
            employment: "정규직",
            location: "경기",
            companySize: "스타트업",
            salary: "협의",
            deadline: "상시",
            postedAt: "2026-05-27",
            tags: ["테스트자동화", "이슈트래킹", "QA프로세스"],
            source: "그룹바이",
            recommended: false,
            recommendScore: 86,
            views: 6,
            bookmarked: true,
        },
        {
            id: 5,
            logo: "어",
            company: "어센트 AI",
            title: "인프라 엔지니어 (IDC)",
            jobType: "DevOps",
            exp: "4~10년",
            employment: "정규직",
            location: "서울",
            companySize: "중견",
            salary: "협의",
            deadline: "상시",
            postedAt: "2026-05-12",
            tags: ["인프라엔지니어", "쿠버네티스", "오픈소스운영"],
            source: "그룹바이",
            recommended: false,
            recommendScore: 84,
            views: 19,
            bookmarked: true,
        },
    ];

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
                        <div className="cw-scrap-card" key={job.id}>
                            <div className="cw-scrap-card-top">
                                <div className="cw-scrap-logo">{job.logo}</div>

                                <div className="cw-scrap-company">
                                    <strong>{job.company}</strong>
                                    <span>
                                        {job.exp} · {job.employment} · {job.location}
                                    </span>
                                </div>

                                <button type="button" className="cw-scrap-bookmark">
                                    <Bookmark size={18} />
                                </button>
                            </div>

                            <h3>{job.title}</h3>

                            <p className="cw-scrap-keywords">
                                {job.tags.map((tag) => `#${tag}`).join(" ")}
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
                bookmarked={Boolean(selectedJob?.bookmarked)}
                onClose={closeDetail}
                onBookmark={toggleBookmark}
            />
        </div>
    );
}

export default ScrappedJobPage;