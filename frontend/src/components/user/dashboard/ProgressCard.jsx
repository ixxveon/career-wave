import { Link } from "react-router-dom";

function ProgressCard() {
    return (

<div className="cw-dashboard-card" id="progress">
    <h3>취업 준비 진행도</h3>

    <div className="cw-progress-row">
        <div className="cw-progress-icon is-blue">📋</div>

        <div>
            <div className="cw-progress-item">
                <span>이력서 완성도</span>
                <strong>80%</strong>
            </div>

            <div className="cw-progress-bar">
                <div style={{ width: "80%" }} />
            </div>

            <Link className="cw-progress-link" to="/documents/resume">
                자세히 보기 →
            </Link>
        </div>
    </div>

    <div className="cw-progress-row">
        <div className="cw-progress-icon is-green">📝</div>

        <div>
            <div className="cw-progress-item">
                <span>자소서 작성률</span>
                <strong>65%</strong>
            </div>

            <div className="cw-progress-bar is-green">
                <div style={{ width: "65%" }} />
            </div>

            <Link className="cw-progress-link" to="/documents/cover-letter">
                자세히 보기 →
            </Link>
        </div>
    </div>

    <div className="cw-progress-row">
        <div className="cw-progress-icon is-purple">👥</div>

        <div>
            <div className="cw-progress-item">
                <span>면접 연습</span>
                <strong>12회</strong>
            </div>

            <div className="cw-progress-bar is-purple">
                <div style={{ width: "55%" }} />
            </div>

            <Link className="cw-progress-link" to="/interview/text">
                자세히 보기 →
            </Link>
        </div>
    </div>

    <div className="cw-progress-summary">
        <div>
            <span>프로필 완성도</span>
            <strong>85%</strong>
        </div>

        <div>
            <span>포트폴리오</span>
            <strong>3개</strong>
        </div>

        <div>
            <span>저장 공고</span>
            <strong>12개</strong>
        </div>
    </div>
    </div>
        );
}

export default ProgressCard;