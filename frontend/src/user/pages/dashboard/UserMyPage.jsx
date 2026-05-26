import { Link } from "react-router-dom";
import {
    ClipboardList,
    FilePenLine,
    UsersRound,
} from "lucide-react";
import "./DashboardPage.css";
import ProgressCard from "../../components/dashboard/ProgressCard";
import InterviewStatusCard from "../../components/dashboard/InterviewStatusCard";
import GithubGrowthCard from "../../components/dashboard/GithubGrowthCard";
import RecommendedActionCard from "../../components/dashboard/RecommendedActionCard";
import RecentActivityCard from "../../components/dashboard/RecentActivityCard";
import FavoriteCompanyCard from "../../components/dashboard/FavoriteCompanyCard";


function UserMyPage() {
    return (
        <div className="cw-mypage-layout">
            <aside className="cw-mypage-sidebar">
                <strong>마이페이지</strong>
                <nav>
                    <a href="#dashboard" className="is-active">MY홈</a>
                    <a href="#activity">활동 기록</a>
                    <Link to="/mypage/favorites">관심 기업</Link>
                    <a href="#settings">계정 설정</a>
                </nav>
            </aside>

            <section className="cw-dashboard-section" id="dashboard">



                <div className="cw-dashboard-title-row">
                    <div className="cw-dashboard-section__title">
                        <h2>오늘의 커리어 현황</h2>
                        <p>AI가 분석한 현재 취업 준비 상태예요.</p>
                    </div>

                    <div className="cw-streak-card">
                        <div>
                            <strong>연속 학습 7일째 🔥</strong>
                            <p>꾸준함이 최고의 경쟁력이에요!</p>
                        </div>
                        <span>🏆</span>
                    </div>
                </div>

                <section className="cw-dashboard-summary">
                    <ProgressCard />
                    <InterviewStatusCard />
                    <GithubGrowthCard />

                </section>

                <section className="cw-mypage-extra-grid">
                    <RecommendedActionCard />
                    <RecentActivityCard />
                    <FavoriteCompanyCard />
                </section>
            </section>
        </div>
    );
}

export default UserMyPage;