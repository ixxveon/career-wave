import { Link } from "react-router-dom";
import { Github } from "lucide-react";

function GithubGrowthCard() {
    return (

        <div className="cw-dashboard-card cw-github-card" id="github">
            <h3>GitHub 성장 그래프</h3>

            <div className="cw-github-stats">
                <div>
                    <span>총 커밋 수</span>
                    <strong>128</strong>
                </div>
                <div>
                    <span>이번 주 커밋</span>
                    <strong>23</strong>
                </div>
                <div>
                    <span>활동 일수</span>
                    <strong>18일</strong>
                </div>
            </div>

            <div className="cw-github-months">
                <span>3월</span>
                <span>4월</span>
                <span>5월</span>
                <span>6월</span>
            </div>

            <div className="cw-github-heatmap-wrap">
                <div className="cw-github-days">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                </div>

                <div className="cw-github-grass" aria-label="GitHub 잔디 그래프">
                    {Array.from({ length: 84 }).map((_, index) => (
                        <span className={`grass-${(index % 4) + 1}`} key={index} />
                    ))}
                </div>
            </div>

            <div className="cw-github-legend">
                <span>Less</span>
                <i className="grass-1" />
                <i className="grass-2" />
                <i className="grass-3" />
                <i className="grass-4" />
                <span>More</span>
            </div>

            <h4 className="cw-stack-title">주요 기술 스택 성장도</h4>

            <div className="cw-stack-tags">
                <span>JavaScript +24%</span>
                <span>Python +18%</span>
                <span>React +15%</span>
                <span>Spring +12%</span>
                <span>SQL +8%</span>
            </div>

            <Link className="cw-github-link" to="/profile">
                <Github size={16} />
                GitHub 프로필 보기 →
            </Link>
        </div>
    );
}

export default GithubGrowthCard;