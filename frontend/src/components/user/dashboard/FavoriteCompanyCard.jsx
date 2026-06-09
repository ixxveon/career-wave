import { Link } from "react-router-dom";
function FavoriteCompanyCard() {
    return (
        <div className="cw-mypage-extra-card" id="company">
            <h3>관심 기업</h3>

            <div className="cw-company-list">
                <span>네이버</span>
                <span>카카오</span>
                <span>토스</span>
                <span>당근</span>
            </div>

            <p className="cw-company-note">
                관심 기업 중 3곳이 현재 채용 중이에요.
            </p>
            <Link className="cw-dashboard-more" to="/mypage/favorites">
                자세히 보기 →
            </Link>

        </div>
    )
}
export default FavoriteCompanyCard;