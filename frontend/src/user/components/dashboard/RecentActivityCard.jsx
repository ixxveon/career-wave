import { Link } from "react-router-dom";
function RecentActivityCard() {
    return (
        <div className="cw-mypage-extra-card" id="activity">
            <h3>최근 활동</h3>

            <ul className="cw-activity-list">
                <li>
                    <span>10분 전</span>
                    <strong>AI 면접 결과 리포트 저장</strong>
                </li>
                <li>
                    <span>1시간 전</span>
                    <strong>네이버 백엔드 공고 지원</strong>
                </li>
                <li>
                    <span>어제</span>
                    <strong>자소서 첨삭 완료</strong>
                </li>
            </ul>
        </div>
    )
}

export default RecentActivityCard;