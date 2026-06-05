import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    UserRound,
    Mail,
    Phone,
    ShieldCheck,
    Github,
} from "lucide-react";
import {
    mockUserProfile,
    mockGithubProfile,
} from "@/user/mocks/dashboardMock";
import type { GithubProfile, UserProfile } from "@/user/types/dashboard";
import "./MyPage.css";

const ROLE_TYPE_LABELS: Record<UserProfile["roleType"], string> = {
    ROLE_USER: "일반 회원",
    ROLE_COMPANY: "기업 회원",
};

const SUBSCRIPTION_STATUS_LABELS: Record<UserProfile["subscriptionStatus"], string> = {
    FREE: "무료",
    PREMIUM: "프리미엄",
};

const MEMBER_STATUS_CONFIG: Record<
    UserProfile["memberStatus"],
    { label: string; className: string }
> = {
    ACTIVE: {
        label: "정상",
        className: "cw-connected",
    },
    SUSPENDED: {
        label: "정지",
        className: "cw-warning",
    },
    BANNED: {
        label: "차단",
        className: "cw-danger",
    },
};

type EditProfileForm = {
    name: string;
    phone: string;
    githubUrl: string;
};

function UserMyPage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(mockUserProfile);
    const [githubProfile, setGithubProfile] = useState<GithubProfile | null>(mockGithubProfile);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<EditProfileForm>({
        name: mockUserProfile.name,
        phone: mockUserProfile.phone,
        githubUrl: mockGithubProfile.githubUrl ?? "",
    });

    const isLoading = false;
    const hasUserProfileError = false;
    const hasGithubProfileError = false;

    function openEditModal() {
        if (!userProfile) return;

        setEditForm({
            name: userProfile.name,
            phone: userProfile.phone,
            githubUrl: githubProfile?.githubUrl ?? "",
        });
        setIsEditModalOpen(true);
    }

    function closeEditModal() {
        setIsEditModalOpen(false);
    }

    function handleEditFormChange(field: keyof EditProfileForm, value: string) {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function saveProfileEdit() {
        if (!userProfile) return;

        const normalizedGithubUrl = editForm.githubUrl.trim();

        setUserProfile({
            ...userProfile,
            name: editForm.name,
            phone: editForm.phone,
        });

        setGithubProfile({
            githubId: normalizedGithubUrl
                ? githubProfile?.githubId ?? null
                : null,
            githubUrl: normalizedGithubUrl || null,
            linked: Boolean(normalizedGithubUrl),
        });

        setIsEditModalOpen(false);
        alert("회원 정보 수정 내용이 Mock 데이터에 반영되었습니다.");
    }

    if (isLoading) {
        return (
            <div className="cw-mypage-layout">
                <section className="cw-account-section">
                    <div className="cw-state-box">회원 정보를 불러오는 중입니다.</div>
                </section>
            </div>
        );
    }

    if (hasUserProfileError) {
        return (
            <div className="cw-mypage-layout">
                <section className="cw-account-section">
                    <div className="cw-state-box is-error">
                        사용자 정보를 불러오지 못했습니다.
                    </div>
                </section>
            </div>
        );
    }

    if (!userProfile) {
        return (
            <div className="cw-mypage-layout">
                <section className="cw-account-section">
                    <div className="cw-state-box">표시할 사용자 정보가 없습니다.</div>
                </section>
            </div>
        );
    }

    const memberStatus = MEMBER_STATUS_CONFIG[userProfile.memberStatus] ?? {
        label: "알 수 없음",
        className: "cw-warning",
    };

    return (
        <div className="cw-mypage-layout">
            <aside className="cw-mypage-sidebar">
                <strong>마이페이지</strong>
                <nav>
                    <NavLink
                        to="/mypage"
                        end
                        className={({ isActive }) => (isActive ? "is-active" : "")}
                    >
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
                        <h3>{userProfile.name}님</h3>
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
                                onClick={openEditModal}
                            >
                                수정
                            </button>
                        </div>

                        <div className="cw-info-list">
                            <div className="cw-info-row">
                                <span>이름</span>
                                <strong>{userProfile.name}</strong>
                            </div>
                            <div className="cw-info-row">
                                <span>이메일</span>
                                <strong>
                                    <Mail size={15} />
                                    {userProfile.email}
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>휴대폰 번호</span>
                                <strong>
                                    <Phone size={15} />
                                    {userProfile.phone || "등록된 휴대폰 번호가 없습니다."}
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>가입일</span>
                                <strong>
                                    {new Date(userProfile.createdAt).toLocaleDateString("ko-KR")}
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
                                <strong>
                                    {ROLE_TYPE_LABELS[userProfile.roleType] ?? "일반 회원"}
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>로그인 ID</span>
                                <strong>{userProfile.loginId}</strong>
                            </div>
                            <div className="cw-info-row">
                                <span>구독 상태</span>
                                <strong>
                                    {SUBSCRIPTION_STATUS_LABELS[
                                        userProfile.subscriptionStatus
                                    ] ?? "무료"}
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>알림 수신</span>
                                <strong>
                                    {userProfile.notificationEnabled ? "수신 동의" : "수신 거부"}
                                </strong>
                            </div>
                            <div className="cw-info-row">
                                <span>계정 상태</span>
                                <strong className={memberStatus.className}>
                                    {memberStatus.label}
                                </strong>
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
                            onClick={openEditModal}
                        >
                            연동 관리
                        </button>
                    </div>

                    {hasGithubProfileError ? (
                        <div className="cw-state-box is-error">
                            GitHub 정보를 불러오지 못했습니다.
                        </div>
                    ) : (
                        <div className="cw-github-simple-grid">
                            <div>
                                <span>GitHub ID</span>
                                <strong>
                                    {githubProfile?.githubId ?? "연동된 GitHub ID가 없습니다."}
                                </strong>
                            </div>

                            <div>
                                <span>GitHub URL</span>
                                <strong>
                                    {githubProfile?.githubUrl ?? "연동된 GitHub URL이 없습니다."}
                                </strong>
                            </div>

                            <div>
                                <span>연동 상태</span>
                                <strong
                                    className={githubProfile?.linked ? "cw-connected" : "cw-warning"}
                                >
                                    {githubProfile?.linked ? "연동 완료" : "미연동"}
                                </strong>
                            </div>

                            <button
                                type="button"
                                className="cw-github-profile-button"
                                onClick={() => alert("GitHub 프로필 이동은 API 연동 후 처리됩니다.")}
                                disabled={!githubProfile?.linked}
                            >
                                GitHub 프로필 보기
                            </button>
                        </div>
                    )}
                </section>
            </section>

            {isEditModalOpen && (
                <div className="cw-edit-modal-overlay" role="presentation">
                    <div className="cw-edit-modal" role="dialog" aria-modal="true">
                        <div className="cw-edit-modal-header">
                            <h3>회원 정보 수정</h3>
                            <p>Mock 데이터 기준으로 수정 UI 흐름을 확인합니다.</p>
                        </div>

                        <div className="cw-edit-form">
                            <label>
                                이름
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(event) =>
                                        handleEditFormChange("name", event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                휴대폰 번호
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(event) =>
                                        handleEditFormChange("phone", event.target.value)
                                    }
                                />
                            </label>

                            <label>
                                GitHub URL
                                <input
                                    type="text"
                                    value={editForm.githubUrl}
                                    placeholder="https://github.com/username"
                                    onChange={(event) =>
                                        handleEditFormChange("githubUrl", event.target.value)
                                    }
                                />
                            </label>
                        </div>

                        <div className="cw-edit-modal-actions">
                            <button type="button" onClick={closeEditModal}>
                                취소
                            </button>
                            <button
                                type="button"
                                className="is-primary"
                                onClick={saveProfileEdit}
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserMyPage;