import { useEffect, useRef, useState } from "react";
import MyPageSidebar from "../../../components/user/mypage/MyPageSidebar";
import {
  UserRound,
  Mail,
  Phone,
  ShieldCheck,
  Github,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/user/subscription";
import { updateDashboardProfile } from "@/api/user/dashboard";
import { memberVerificationApi } from "@/api/user/member";
import { formatPhoneNumber, isValidVerificationCode, normalizePhone, PHONE_MAX_LENGTH } from "@/utils/user/member/registerSchema";
import { formatSubscriptionStatusLabel } from "@/utils/user/subscription/subscriptionView";
import { formatRemaining, getRecoveryErrorMessage, getRemainingSeconds } from "@/utils/user/member/recoveryView";
import { useVerificationNow } from "@/hooks/user/member";
import {
  useDashboardGithub,
  useDashboardProfile,
} from "../../../hooks/user/dashboard";

import { MEMBER_TYPE, VERIFICATION_CHANNEL, VERIFICATION_PURPOSE } from "@/types/user/member";
import type { UserProfile } from "@/types/user/dashboard";

import "@/styles/user/mypage/MyPage.css";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name: string) {
  return /^[가-힣a-zA-Z\s]{2,20}$/.test(name);
}

function normalizeGithubUrl(githubUrl: string) {
  const trimmedGithubUrl = githubUrl.trim();

  if (!trimmedGithubUrl) return "";

  if (trimmedGithubUrl.startsWith("https://")) {
    return trimmedGithubUrl.replace(/\/$/, "");
  }

  if (trimmedGithubUrl.startsWith("github.com/")) {
    return `https://${trimmedGithubUrl}`.replace(/\/$/, "");
  }

  return trimmedGithubUrl;
}

function isValidGithubUrl(githubUrl: string) {
  return /^https:\/\/(www\.)?github\.com\/[A-Za-z0-9-]+$/.test(githubUrl);
}

const ROLE_TYPE_LABELS: Record<UserProfile["roleType"], string> = {
  USER: "일반 회원",
  COMPANY: "기업 회원",
};

const MEMBER_STATUS_CONFIG: Record<
  UserProfile["memberStatus"],
  { label: string; className: string }
> = {
  ACTIVE: { label: "정상", className: "cw-connected" },
  SUSPENDED: { label: "정지", className: "cw-warning" },
  BANNED: { label: "차단", className: "cw-danger" },
  LOCKED: { label: "잠김", className: "cw-warning" },
  WITHDRAWN: { label: "탈퇴", className: "cw-danger" },
  BLACKLISTED: { label: "블랙리스트", className: "cw-danger" },
};

type EditProfileForm = {
  name: string;
  email: string;
  phone: string;
  githubUrl: string;
};

type FieldVerification = {
  verificationId: string;
  verificationToken: string;
  verifiedValue: string;
  code: string;
  expiresAt: string;
  resendAvailableAt: string;
};

const EMPTY_FIELD_VERIFICATION: FieldVerification = {
  verificationId: "",
  verificationToken: "",
  verifiedValue: "",
  code: "",
  expiresAt: "",
  resendAvailableAt: "",
};

function UserMyPage() {
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    isError: hasUserProfileError,
    refetch: refetchProfile,
  } = useDashboardProfile();

  const {
    data: githubProfile,
    isLoading: isGithubLoading,
    refetch: refetchGithub,
  } = useDashboardGithub();

  const {
    subscribedItems,
    refundPendingItems,
    isLoading: isSubscriptionLoading,
    isError: hasSubscriptionError,
  } = useSubscriptionStatus();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditProfileForm>({
    name: "",
    email: "",
    phone: "",
    githubUrl: "",
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const isSavingProfileRef = useRef(false);
  const [editErrorMessage, setEditErrorMessage] = useState("");

  const [emailVerification, setEmailVerification] = useState<FieldVerification>(EMPTY_FIELD_VERIFICATION);
  const [phoneVerification, setPhoneVerification] = useState<FieldVerification>(EMPTY_FIELD_VERIFICATION);
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [isConfirmingEmailCode, setIsConfirmingEmailCode] = useState(false);
  const [isConfirmingPhoneCode, setIsConfirmingPhoneCode] = useState(false);
  const now = useVerificationNow();

  const isLoading = isProfileLoading || isGithubLoading;

  useEffect(() => {
    if (!isEditModalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeEditModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditModalOpen]);

  function openEditModal() {
    if (!userProfile) return;

    setEditForm({
      name: userProfile.name,
      email: userProfile.email ?? "",
      phone: formatPhoneNumber(userProfile.phone ?? ""),
      githubUrl: githubProfile?.githubUrl ?? "",
    });
    setEmailVerification(EMPTY_FIELD_VERIFICATION);
    setPhoneVerification(EMPTY_FIELD_VERIFICATION);

    setEditErrorMessage("");
    setIsEditModalOpen(true);
  }

  function closeEditModal() {
    setEditErrorMessage("");
    setIsEditModalOpen(false);
  }

  function handleEditFormChange(field: keyof EditProfileForm, value: string) {
    setEditErrorMessage("");

    const formattedValue = field === "phone" ? formatPhoneNumber(value) : value;

    setEditForm((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));

    // 이메일/휴대폰 값을 다시 바꾸면 이전에 받은 인증 상태는 더 이상 유효하지 않다.
    if (field === "email") {
      setEmailVerification(EMPTY_FIELD_VERIFICATION);
    }
    if (field === "phone") {
      setPhoneVerification(EMPTY_FIELD_VERIFICATION);
    }
  }

  async function handleSendEmailCode() {
    const target = editForm.email.trim();
    if (!isValidEmail(target)) {
      setEditErrorMessage("이메일 형식이 올바르지 않습니다.");
      return;
    }
    setEditErrorMessage("");
    setIsSendingEmailCode(true);
    try {
      const result = await memberVerificationApi.send({
        channel: VERIFICATION_CHANNEL.EMAIL,
        target,
        purpose: VERIFICATION_PURPOSE.EMAIL_CHANGE,
      });
      setEmailVerification({
        ...EMPTY_FIELD_VERIFICATION,
        verificationId: result.verificationId,
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt,
      });
    } catch (error) {
      setEditErrorMessage(getRecoveryErrorMessage(error, "이메일 인증번호 발송에 실패했습니다."));
    } finally {
      setIsSendingEmailCode(false);
    }
  }

  async function handleConfirmEmailCode() {
    if (!emailVerification.verificationId) return;
    setEditErrorMessage("");
    setIsConfirmingEmailCode(true);
    try {
      const result = await memberVerificationApi.confirm({
        verificationId: emailVerification.verificationId,
        code: emailVerification.code.trim(),
      });
      setEmailVerification((prev) => ({
        ...prev,
        verificationToken: result.verificationToken,
        verifiedValue: editForm.email.trim(),
      }));
    } catch (error) {
      setEditErrorMessage(getRecoveryErrorMessage(error, "이메일 인증에 실패했습니다."));
    } finally {
      setIsConfirmingEmailCode(false);
    }
  }

  async function handleSendPhoneCode() {
    const target = normalizePhone(editForm.phone);
    if (!/^010[0-9]{8}$/.test(target)) {
      setEditErrorMessage("휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.");
      return;
    }
    setEditErrorMessage("");
    setIsSendingPhoneCode(true);
    try {
      const result = await memberVerificationApi.send({
        channel: VERIFICATION_CHANNEL.PHONE,
        target,
        purpose: VERIFICATION_PURPOSE.PHONE_CHANGE,
      });
      setPhoneVerification({
        ...EMPTY_FIELD_VERIFICATION,
        verificationId: result.verificationId,
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt,
      });
    } catch (error) {
      setEditErrorMessage(getRecoveryErrorMessage(error, "휴대폰 인증번호 발송에 실패했습니다."));
    } finally {
      setIsSendingPhoneCode(false);
    }
  }

  async function handleConfirmPhoneCode() {
    if (!phoneVerification.verificationId) return;
    setEditErrorMessage("");
    setIsConfirmingPhoneCode(true);
    try {
      const result = await memberVerificationApi.confirm({
        verificationId: phoneVerification.verificationId,
        code: phoneVerification.code.trim(),
      });
      setPhoneVerification((prev) => ({
        ...prev,
        verificationToken: result.verificationToken,
        verifiedValue: normalizePhone(editForm.phone),
      }));
    } catch (error) {
      setEditErrorMessage(getRecoveryErrorMessage(error, "휴대폰 인증에 실패했습니다."));
    } finally {
      setIsConfirmingPhoneCode(false);
    }
  }

  async function saveProfileEdit() {
    if (!userProfile || isSavingProfileRef.current) return;
    isSavingProfileRef.current = true;
    setEditErrorMessage("");

    const trimmedName = editForm.name.trim();
    const trimmedEmail = editForm.email.trim();
    const normalizedPhone = normalizePhone(editForm.phone);
    const normalizedGithubUrl = normalizeGithubUrl(editForm.githubUrl);
    if (!hasEditFormChanges) {
      setIsEditModalOpen(false);
      setEditErrorMessage("");
      isSavingProfileRef.current = false;
      return;
    }
    if (!trimmedName) {
      setEditErrorMessage("이름을 입력해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    if (!trimmedEmail) {
      setEditErrorMessage("이메일을 입력해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    if (!normalizedPhone) {
      setEditErrorMessage("휴대폰 번호를 입력해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    if (trimmedName !== userProfile.name && !isValidName(trimmedName)) {
      setEditErrorMessage("이름은 2~20자의 한글 또는 영문으로 입력해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setEditErrorMessage("이메일 형식이 올바르지 않습니다.");
      isSavingProfileRef.current = false;
      return;
    }

    if (!/^010[0-9]{8}$/.test(normalizedPhone)) {
      setEditErrorMessage("휴대폰 번호는 01012345678 형식으로 입력해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    if (normalizedGithubUrl && !isValidGithubUrl(normalizedGithubUrl)) {
      setEditErrorMessage(
        "GitHub URL은 github.com/username 또는 https://github.com/username 형식으로 입력해 주세요.",
      );
      isSavingProfileRef.current = false;
      return;
    }

    const emailChanged = trimmedEmail !== "" && trimmedEmail !== (userProfile.email ?? "");
    const phoneChanged = normalizedPhone !== "" && normalizedPhone !== userProfile.phone;

    if (emailChanged && emailVerification.verifiedValue !== trimmedEmail) {
      setEditErrorMessage("이메일 인증을 완료해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    if (phoneChanged && phoneVerification.verifiedValue !== normalizedPhone) {
      setEditErrorMessage("휴대폰 인증을 완료해 주세요.");
      isSavingProfileRef.current = false;
      return;
    }

    try {
      setIsSavingProfile(true);

      await updateDashboardProfile({
        name: trimmedName,
        email: trimmedEmail,
        phone: normalizedPhone,
        ...(normalizedGithubUrl && { githubUrl: normalizedGithubUrl }),
        emailVerificationToken: emailChanged ? emailVerification.verificationToken : undefined,
        phoneVerificationToken: phoneChanged ? phoneVerification.verificationToken : undefined,
      });

      await Promise.all([refetchProfile(), refetchGithub()]);

      setIsEditModalOpen(false);
    } catch {
      setEditErrorMessage("회원 정보 수정에 실패했습니다.");
    } finally {
      isSavingProfileRef.current = false;
      setIsSavingProfile(false);
    }
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
  // QA #1140 — 기업 회원에게는 AI 서비스 / 구독·결제 / GitHub 연동 정보를 노출하지 않는다.
  const isCompanyMember = userProfile.roleType === MEMBER_TYPE.COMPANY;
  const hasEditFormChanges =
    editForm.name.trim() !== userProfile.name ||
    editForm.email.trim() !== (userProfile.email ?? "") ||
    editForm.phone.replace(/-/g, "").trim() !== (userProfile.phone ?? "") ||
    normalizeGithubUrl(editForm.githubUrl) !== (githubProfile?.githubUrl ?? "");

  const trimmedEditEmail = editForm.email.trim();
  const normalizedEditPhone = normalizePhone(editForm.phone);
  const isEmailChanged = trimmedEditEmail !== "" && trimmedEditEmail !== (userProfile.email ?? "");
  const isPhoneChanged = normalizedEditPhone !== "" && normalizedEditPhone !== userProfile.phone;
  const isEmailVerified = emailVerification.verificationToken !== "" && emailVerification.verifiedValue === trimmedEditEmail;
  const isPhoneVerified = phoneVerification.verificationToken !== "" && phoneVerification.verifiedValue === normalizedEditPhone;
  const emailExpiresIn = getRemainingSeconds(emailVerification.expiresAt, now);
  const emailResendIn = getRemainingSeconds(emailVerification.resendAvailableAt, now);
  const phoneExpiresIn = getRemainingSeconds(phoneVerification.expiresAt, now);
  const phoneResendIn = getRemainingSeconds(phoneVerification.resendAvailableAt, now);

  return (
    <div className="cw-mypage-layout">
      <MyPageSidebar />

      <section className="cw-account-section">
        <div className="cw-account-header">
          <div>
            <span className="cw-account-badge">ACCOUNT SETTINGS</span>
            <h2>내 정보 관리</h2>
            <p>
              {isCompanyMember
                ? "회원 정보를 관리할 수 있어요."
                : "회원 정보와 GitHub 연동 정보를 관리할 수 있어요."}
            </p>
          </div>
        </div>

        <div className="cw-account-profile-card">
          <div className="cw-profile-avatar">
            <UserRound size={34} />
          </div>

          <div className="cw-profile-main">
            <div className="cw-profile-header">
              <h3>{userProfile.name}님</h3>

              <button
                type="button"
                className="cw-profile-edit-button"
                onClick={openEditModal}
              >
                <Pencil size={16} />
                정보 수정
              </button>
            </div>

            <p>Career Wave에서 계정 정보와 연동 상태를 관리 중입니다.</p>

            <span className="cw-profile-status">
              {userProfile.email ? "이메일 인증 완료" : "이메일 미등록"}
            </span>
          </div>
        </div>

        <div className="cw-account-grid">
          <section className="cw-account-card">
            <div className="cw-card-title has-action">
              <div className="cw-card-title-left">
                <UserRound size={18} />
                <h3>기본 계정 정보</h3>
              </div>
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
                  {userProfile.email ?? "이메일 없음"}
                </strong>
              </div>
              <div className="cw-info-row">
                <span>휴대폰 번호</span>
                <strong>
                  <Phone size={15} />
                  {userProfile.phone
                    ? formatPhoneNumber(userProfile.phone)
                    : "등록된 휴대폰 번호가 없습니다."}
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

              {!isCompanyMember && (
                <div className="cw-info-row">
                  <span>구독 상태</span>
                  <strong>
                    {isSubscriptionLoading
                      ? "구독 상태 확인 중..."
                      : hasSubscriptionError
                        ? "구독 상태 확인 불가"
                        : subscribedItems.length > 0 || refundPendingItems.length > 0
                          ? [
                              ...subscribedItems.map(formatSubscriptionStatusLabel),
                              ...refundPendingItems.map((item) => `${item.title} 환불 대기 중`),
                            ].join(" · ")
                          : "미구독"}
                  </strong>
                </div>
              )}
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

        {!isCompanyMember && (
        <section className="cw-account-card cw-github-card">
          <div className="cw-card-title">
            <div className="cw-card-title-left">
              <Github size={18} />
              <h3>GitHub 연동 정보</h3>
            </div>

            <button
              type="button"
              className="cw-card-edit-button"
              disabled
              title="GitHub OAuth 연동 기능은 v2에서 제공될 예정입니다."
            >
              연동 관리
            </button>
          </div>

          <p className="cw-card-notice">
            GitHub 연동 기능은 현재 이용할 수 없습니다.
          </p>
        </section>
        )}

        <p className="cw-withdrawal-notice">
          회원 탈퇴를 원하시면{" "}
          <button
            type="button"
            className="cw-withdrawal-notice__link"
            disabled
            title="회원 탈퇴 기능은 준비 중입니다."
          >
            1:1 문의
          </button>
          를 통해 요청해 주세요.
        </p>
      </section>

      {isEditModalOpen && (
        <div className="cw-edit-modal-overlay" role="presentation">
          <div className="cw-edit-modal" role="dialog" aria-modal="true">
            <div className="cw-edit-modal-header">
              <h3>회원 정보 수정</h3>
              <p>수정할 회원 정보를 입력한 뒤 저장해 주세요.</p>
            </div>

            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void saveProfileEdit();
              }}
            >
              <div className="cw-edit-form">
                <label>
                  이름
                  <input
                    type="text"
                    value={editForm.name ?? ""}
                    onChange={(event) =>
                      handleEditFormChange("name", event.target.value)
                    }
                  />
                </label>

                <label>
                  이메일
                  <div className="cw-verify-inline">
                    <input
                      type="text"
                      value={editForm.email ?? ""}
                      placeholder="example@email.com"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      onChange={(event) =>
                        handleEditFormChange("email", event.target.value)
                      }
                    />
                    {isEmailChanged && !isEmailVerified && (
                      <button
                        type="button"
                        className="cw-verify-send-button"
                        onClick={() => void handleSendEmailCode()}
                        disabled={isSendingEmailCode || emailResendIn > 0}
                      >
                        {isSendingEmailCode
                          ? "전송 중"
                          : emailVerification.verificationId
                            ? `재전송${emailResendIn > 0 ? ` ${formatRemaining(emailResendIn)}` : ""}`
                            : "인증번호 전송"}
                      </button>
                    )}
                  </div>
                  {isEmailChanged && isEmailVerified && (
                    <span className="cw-verify-status">
                      <CheckCircle2 size={14} /> 이메일 인증 완료
                    </span>
                  )}
                  {isEmailChanged && !isEmailVerified && emailVerification.verificationId && (
                    <div className="cw-verify-inline">
                      <input
                        type="text"
                        value={emailVerification.code}
                        placeholder="인증번호 6자리"
                        onChange={(event) =>
                          setEmailVerification((prev) => ({ ...prev, code: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="cw-verify-send-button"
                        onClick={() => void handleConfirmEmailCode()}
                        disabled={
                          isConfirmingEmailCode ||
                          emailExpiresIn <= 0 ||
                          !isValidVerificationCode(emailVerification.code)
                        }
                      >
                        {isConfirmingEmailCode ? "확인 중" : "인증 확인"}
                      </button>
                    </div>
                  )}
                  {isEmailChanged && !isEmailVerified && emailVerification.verificationId && emailExpiresIn > 0 && (
                    <small className="cw-input-help">인증번호 유효 시간 {formatRemaining(emailExpiresIn)}</small>
                  )}
                  {isEmailChanged && !isEmailVerified && emailVerification.verificationId && emailExpiresIn <= 0 && (
                    <small className="cw-input-help">인증번호가 만료되었습니다. 다시 전송해 주세요.</small>
                  )}
                </label>

                <label>
                  휴대폰 번호
                  <div className="cw-verify-inline">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={PHONE_MAX_LENGTH}
                      value={editForm.phone ?? ""}
                      placeholder="휴대폰번호('-' 없이 숫자만 입력)"
                      onChange={(event) =>
                        handleEditFormChange("phone", event.target.value)
                      }
                    />
                    {isPhoneChanged && !isPhoneVerified && (
                      <button
                        type="button"
                        className="cw-verify-send-button"
                        onClick={() => void handleSendPhoneCode()}
                        disabled={isSendingPhoneCode || phoneResendIn > 0}
                      >
                        {isSendingPhoneCode
                          ? "전송 중"
                          : phoneVerification.verificationId
                            ? `재전송${phoneResendIn > 0 ? ` ${formatRemaining(phoneResendIn)}` : ""}`
                            : "인증번호 전송"}
                      </button>
                    )}
                  </div>
                  {isPhoneChanged && isPhoneVerified && (
                    <span className="cw-verify-status">
                      <CheckCircle2 size={14} /> 휴대폰 인증 완료
                    </span>
                  )}
                  {isPhoneChanged && !isPhoneVerified && phoneVerification.verificationId && (
                    <div className="cw-verify-inline">
                      <input
                        type="text"
                        value={phoneVerification.code}
                        placeholder="인증번호 6자리"
                        onChange={(event) =>
                          setPhoneVerification((prev) => ({ ...prev, code: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="cw-verify-send-button"
                        onClick={() => void handleConfirmPhoneCode()}
                        disabled={
                          isConfirmingPhoneCode ||
                          phoneExpiresIn <= 0 ||
                          !isValidVerificationCode(phoneVerification.code)
                        }
                      >
                        {isConfirmingPhoneCode ? "확인 중" : "인증 확인"}
                      </button>
                    </div>
                  )}
                  {isPhoneChanged && !isPhoneVerified && phoneVerification.verificationId && phoneExpiresIn > 0 && (
                    <small className="cw-input-help">인증번호 유효 시간 {formatRemaining(phoneExpiresIn)}</small>
                  )}
                  {isPhoneChanged && !isPhoneVerified && phoneVerification.verificationId && phoneExpiresIn <= 0 && (
                    <small className="cw-input-help">인증번호가 만료되었습니다. 다시 전송해 주세요.</small>
                  )}
                </label>

              </div>

              {editErrorMessage && (
                <p className="cw-edit-error-message">{editErrorMessage}</p>
              )}

              <div className="cw-edit-modal-actions">
                <button type="button" onClick={closeEditModal}>
                  취소
                </button>
                <button
                  type="submit"
                  className="is-primary"
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default UserMyPage;
