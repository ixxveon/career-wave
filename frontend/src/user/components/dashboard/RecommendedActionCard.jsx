import { Link } from "react-router-dom";
function RecommendedActionCard() {
    return (
        <div className="cw-mypage-extra-card" id="recommend">
            <h3>오늘의 추천 액션</h3>

            <ul className="cw-action-list">
                <li>
                    <strong>자소서 분석 1건 남았어요</strong>
                    <span>완성도를 80% 이상으로 올려보세요.</span>
                </li>
                <li>
                    <strong>AI 면접 연습을 이어가 보세요</strong>
                    <span>최근 2일 동안 연습 기록이 없어요.</span>
                </li>
                <li>
                    <strong>React 공고 12개가 새로 등록됐어요</strong>
                    <span>관심 직무와 일치하는 공고예요.</span>
                </li>
            </ul>
        </div>
    )
}
export default RecommendedActionCard;