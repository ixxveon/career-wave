import { NavLink } from "react-router-dom";
import {
    UserRound,
    Mail,
    Phone,
    CalendarDays,
    ShieldCheck,
    Github,
} from "lucide-react";
import "./MyPage.css";

function UserMyPage() {
    return (
        <div className="cw-mypage-layout">
            <aside className="cw-mypage-sidebar">
                <strong>마이페이지</strong>
                <nav>
                    <NavLink to="/mypage" end className="is-active">
                        내 정보 관리
                    </NavLink>
                    <NavLink to="/mypage/favorites">스크랩 공고</NavLink>
                    <NavLink to="/mypage/subscription">AI 서비스</NavLink>
                    <NavLink to="/mypage/payment-history">구독/결제 내역</NavLink>
                </nav>
            </aside>

            <section className="cw-account-section">
                <div className="cw-account-header">
                    <div>
                        <span className="cw-account-badge">ACCOUNT SETTINGS</span>
                        <h2>내 정보 관리</h2>
                        <p>회원 정보와 GitHub 연동 정보를 관리할 수 있어요.</p>
                    </div>
                </div>

                <div className="cw-account-profile-card">
                    <div className="cw-profile-avatar">
                        <UserRound size={34} />
                    </div>

                    <div className="cw-profile-main">
                        <h3>김지원님</h3>
                        <p>Career Wave에서 계정 정보와 연동 상태를 관리 중입니다.</p>
                    </div>

                    <span className="cw-profile-status">이메일 인증 완료</span>
                </div>

                <div className="cw-account-grid">
                    <section className="cw-account-card">
                        <div className="cw-card-title has-action">
                            <div className="cw-card-title-left">
                                <UserRound size={18} />
                                <h3>기본 계정 정보</h3>
                            </div>

                            <button
                                type="button"
                                className="cw-card-edit-button"
                                onClick={() => alert("회원 정보 수정 기능은 준비 중입니다.")}
                            >
                                수정
                            </button>
                        </div>

                        <div className="cw-info-list">
                            <div className="cw-info-row">
                                <span>이름</span>
                                <strong>김지원</strong>
                            </div>
                            <div className="cw-info-row">
                                <span>이메일</span>
                                <strong>
                                    <Mail size={15} />
                                    jiwon.kim@example.com
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>휴대폰 번호</span>
                                <strong>
                                    <Phone size={15} />
                                    010-1234-5678
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>가입일</span>
                                <strong>
                                    <CalendarDays size={15} />
                                    2026.05.20
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="cw-account-card">
                        <div className="cw-card-title">
                            <ShieldCheck size={18} />
                            <h3>계정 상태</h3>
                        </div>

                        <div className="cw-info-list">
                            <div className="cw-info-row">
                                <span>회원 유형</span>
                                <strong>일반 회원</strong>
                            </div>
                            <div className="cw-info-row">
                                <span>로그인 방식</span>
                                <strong>이메일 로그인</strong>
                            </div>
                            <div className="cw-info-row">
                                <span>알림 수신</span>
                                <strong>수신 동의</strong>
                            </div>
                            <div className="cw-info-row">
                                <span>계정 상태</span>
                                <strong className="cw-connected">정상</strong>
                            </div>
                        </div>
                    </section>
                </div>

                <section className="cw-account-card cw-github-card">
                    <div className="cw-card-title has-action">
                        <div className="cw-card-title-left">
                            <Github size={18} />
                            <h3>GitHub 연동 정보</h3>
                        </div>

                        <button
                            type="button"
                            className="cw-card-edit-button"
                            onClick={() => alert("GitHub 연동 기능은 준비 중입니다.")}
                        >
                            연동 관리
                        </button>
                    </div>

                    <div className="cw-github-simple-grid">
                        <div>
                            <span>GitHub ID</span>
                            <strong>jiwon-dev</strong>
                        </div>

                        <div>
                            <span>GitHub URL</span>
                            <strong>https://github.com/jiwon-dev</strong>
                        </div>

                        <div>
                            <span>연동 상태</span>
                            <strong className="cw-connected">연동 완료</strong>
                        </div>
                        <button
                            type="button"
                            className="cw-github-profile-button"
                            onClick={() => alert("GitHub 연동 기능은 준비 중입니다.")}
                        >
                            GitHub 프로필 보기
                        </button>
                    </div>
                </section>
            </section>
        </div>
    );
}

export default UserMyPage;