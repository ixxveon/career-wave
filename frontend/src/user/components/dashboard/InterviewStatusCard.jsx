import { Link } from "react-router-dom";

function InterviewStatusCard() {
    return (
        <div className="cw-dashboard-card cw-interview-card" id="interview">
            <h3>AI 면접 연습 현황</h3>

            <div className="cw-interview-stats">
                <div>
                    <span>누적 연습 횟수</span>
                    <strong>
                        24<em>회</em>
                    </strong>
                    <p>지난 주 대비 +12%</p>
                </div>
                <div>
                    <span>이번 주 연습</span>
                    <strong>
                        3<em>회</em>
                    </strong>
                    <p>지난 주 대비 +5%</p>
                </div>
            </div>

            <div className="cw-chart-title">
                <h4>최근 모의면접 점수 추이</h4>
                <Link className="cw-chart-filter" to="/interview">
                    최근 5회
                </Link>
            </div>

            <div className="cw-line-chart">
                <span>62</span>
                <span>68</span>
                <span>72</span>
                <span>78</span>
                <span>85</span>
            </div>
        </div>
    );
}

export default InterviewStatusCard;