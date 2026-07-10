import { NavLink } from "react-router-dom";
import { useIsCompanyMember } from "../../../hooks/user/useIsCompanyMember";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "is-active" : "";

/**
 * 마이페이지 공통 사이드바.
 * QA #1140 · #1173 — 기업 회원에게는 `AI 서비스` / `구독·결제 내역` 메뉴를 노출하지 않는다.
 * 각 마이페이지가 사이드바를 개별 렌더링하면 일부 화면에서 숨김이 누락되므로 한 곳에서 관리한다.
 */
function MyPageSidebar() {
  const isCompanyMember = useIsCompanyMember();

  return (
    <aside className="cw-mypage-sidebar">
      <strong>마이페이지</strong>
      <nav>
        <NavLink to="/mypage" end className={linkClass}>
          내 정보 관리
        </NavLink>
        <NavLink to="/mypage/favorites" className={linkClass}>
          스크랩 공고
        </NavLink>
        {!isCompanyMember && (
          <>
            <NavLink to="/mypage/subscription" className={linkClass}>
              AI 서비스
            </NavLink>
            <NavLink to="/mypage/payment-history" className={linkClass}>
              구독/결제 내역
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}

export default MyPageSidebar;
