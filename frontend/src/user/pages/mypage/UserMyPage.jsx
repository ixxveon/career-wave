import { Link, NavLink } from "react-router-dom";
import {
    ClipboardList,
    FilePenLine,
    Github,
    UsersRound,
} from "lucide-react";
import "./MyPage.css";



function UserMyPage() {
    return (
        <div className="cw-mypage-layout">
            <aside className="cw-mypage-sidebar">
                <strong>마이페이지</strong>
                <nav>
                    <NavLink to="/mypage" end className="is-active">내 정보 관리</NavLink>
                    <NavLink to="/mypage/favorites">스크랩 공고</NavLink>
                    <NavLink to="/mypage/subscription">AI 서비스</NavLink>
                    <NavLink to="/mypage/payment-history">구독/결제 내역</NavLink>
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

                                <Link className="cw-progress-link" to="/career-history">
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
                            <Link className="cw-chart-filter" to="/career-history">
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
                </section>

                <section className="cw-mypage-extra-grid">
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
                </section>
            </section>
        </div>
    );
}

export default UserMyPage;
