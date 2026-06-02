import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import { useFindPasswordRecovery } from '../../hooks/member';
import { RECOVERY_METHOD } from '../../utils/member/recoverySchema';
import RecoveryPasswordFields from '../../components/member/RecoveryPasswordFields';
import { RecoveryCodeField, RecoveryContactField } from '../../components/member/RecoveryVerificationFields';
import RecoverySupportPanel from './RecoverySupportPanel';
import './AuthPage.css';

function FindPasswordPage() {
  const { memberType } = useParams();
  const isCompany = memberType === 'company';
  const {
    userMethod,
    userForm,
    companyForm,
    fieldErrors,
    formMessage,
    successMessage,
    activeUserVerification,
    companyVerification,
    activeResetSession,
    userExpiresIn,
    userResendIn,
    companyExpiresIn,
    companyResendIn,
    activeResetExpiresIn,
    hasResetToken,
    sendVerificationPending,
    confirmVerificationPending,
    issuePasswordTokenPending,
    resetPasswordPending,
    updateUser,
    updateCompany,
    resetUserMethod,
    handleSendUserCode,
    handleConfirmUserCode,
    handleSendCompanyCode,
    handleConfirmCompanyCode,
    handleIssueResetToken,
    handleResetPassword,
  } = useFindPasswordRecovery(isCompany);

  return (
    <section className="cw-auth-page cw-auth-page--recovery">
      <div className="cw-auth-recovery cw-auth-recovery--detail">
        <div className="cw-auth-recovery__hero">
          <p className="cw-auth-eyebrow">FIND PASSWORD</p>
          <h1>{isCompany ? '기업회원 비밀번호 찾기' : '개인회원 비밀번호 찾기'}</h1>
          <p>
            {isCompany
              ? '아이디와 담당자 정보, 사업자등록번호, 담당자 이메일 인증 후 비밀번호를 재설정할 수 있습니다.'
              : '아이디와 본인 인증 후 비밀번호를 재설정할 수 있습니다.'}
          </p>
        </div>

        <div className="cw-auth-card cw-auth-card--detail">
          {!isCompany && (
            <div className="cw-register-tabs cw-register-tabs--auth" role="tablist" aria-label="개인회원 인증 방식">
              <button
                className={userMethod === RECOVERY_METHOD.EMAIL ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={userMethod === RECOVERY_METHOD.EMAIL}
                onClick={() => resetUserMethod(RECOVERY_METHOD.EMAIL)}
              >
                이메일로 인증
              </button>
              <button
                className={userMethod === RECOVERY_METHOD.PHONE ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={userMethod === RECOVERY_METHOD.PHONE}
                onClick={() => resetUserMethod(RECOVERY_METHOD.PHONE)}
              >
                휴대폰 번호로 인증
              </button>
            </div>
          )}

          <form className="cw-auth-form" noValidate>
            {!isCompany && (
              <label>
                아이디
                <span>
                  <UserRound size={18} />
                  <input
                    aria-invalid={Boolean(fieldErrors.loginId)}
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={userForm.loginId}
                    onChange={(event) => updateUser('loginId', event.target.value)}
                  />
                </span>
                {fieldErrors.loginId && <p className="cw-register-error">{fieldErrors.loginId}</p>}
              </label>
            )}

            {!isCompany && userMethod === RECOVERY_METHOD.EMAIL && (
              <RecoveryContactField
                label="이메일"
                icon={<Mail size={18} />}
                value={userForm.email}
                placeholder="이메일 주소 입력"
                error={fieldErrors.email}
                verification={activeUserVerification}
                feedbackText="이메일 인증번호가 발송되었습니다."
                sendPending={sendVerificationPending}
                resendIn={userResendIn}
                buttonClassName="cw-auth-sub-button cw-auth-sub-button--send"
                inputType="email"
                onChange={(value) => updateUser('email', value)}
                onSend={handleSendUserCode}
              />
            )}

            {!isCompany && userMethod === RECOVERY_METHOD.PHONE && (
              <RecoveryContactField
                label="휴대폰 번호"
                icon={<Phone size={18} />}
                value={userForm.phone}
                placeholder="휴대폰번호('-' 없이 숫자만 입력)"
                error={fieldErrors.phone}
                verification={activeUserVerification}
                feedbackText="휴대폰 인증번호가 발송되었습니다."
                sendPending={sendVerificationPending}
                resendIn={userResendIn}
                inputType="tel"
                inputMode="numeric"
                onChange={(value) => updateUser('phone', value)}
                onSend={handleSendUserCode}
              />
            )}

            {!isCompany && (
              <RecoveryCodeField
                label="인증번호 입력"
                code={userForm.code}
                error={fieldErrors.code}
                verification={activeUserVerification}
                expiresIn={userExpiresIn}
                resendIn={userResendIn}
                confirmPending={confirmVerificationPending}
                sendPending={sendVerificationPending}
                onCodeChange={(value) => updateUser('code', value)}
                onConfirm={handleConfirmUserCode}
                onResend={handleSendUserCode}
              />
            )}

            {isCompany && (
              <>
                <label>
                  아이디
                  <span>
                    <UserRound size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.loginId)}
                      type="text"
                      placeholder="아이디를 입력하세요"
                      value={companyForm.loginId}
                      onChange={(event) => updateCompany('loginId', event.target.value)}
                    />
                  </span>
                  {fieldErrors.loginId && <p className="cw-register-error">{fieldErrors.loginId}</p>}
                </label>
                <label>
                  담당자명
                  <span>
                    <UserRound size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.managerName)}
                      type="text"
                      placeholder="담당자명(실명)"
                      value={companyForm.managerName}
                      onChange={(event) => updateCompany('managerName', event.target.value)}
                    />
                  </span>
                  {fieldErrors.managerName && <p className="cw-register-error">{fieldErrors.managerName}</p>}
                </label>
                <label>
                  사업자등록번호
                  <span>
                    <Building2 size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.businessNumber)}
                      inputMode="numeric"
                      type="text"
                      placeholder="사업자등록번호('-' 없이 숫자만 입력)"
                      value={companyForm.businessNumber}
                      onChange={(event) => updateCompany('businessNumber', event.target.value)}
                    />
                  </span>
                  {fieldErrors.businessNumber && <p className="cw-register-error">{fieldErrors.businessNumber}</p>}
                </label>
                <RecoveryContactField
                  label="담당자 이메일"
                  icon={<Mail size={18} />}
                  value={companyForm.email}
                  placeholder="담당자 이메일 주소 입력"
                  error={fieldErrors.email}
                  verification={companyVerification}
                  feedbackText="이메일 인증번호가 발송되었습니다."
                  sendPending={sendVerificationPending}
                  resendIn={companyResendIn}
                  buttonClassName="cw-auth-sub-button cw-auth-sub-button--send"
                  inputType="email"
                  onChange={(value) => updateCompany('email', value)}
                  onSend={handleSendCompanyCode}
                />
                <RecoveryCodeField
                  label="이메일 인증번호 입력"
                  code={companyForm.code}
                  error={fieldErrors.code}
                  verification={companyVerification}
                  expiresIn={companyExpiresIn}
                  resendIn={companyResendIn}
                  confirmPending={confirmVerificationPending}
                  sendPending={sendVerificationPending}
                  onCodeChange={(value) => updateCompany('code', value)}
                  onConfirm={handleConfirmCompanyCode}
                  onResend={handleSendCompanyCode}
                />
              </>
            )}

            {hasResetToken && (
              <RecoveryPasswordFields
                password={isCompany ? companyForm.nextPassword : userForm.nextPassword}
                passwordConfirm={isCompany ? companyForm.nextPasswordConfirm : userForm.nextPasswordConfirm}
                passwordError={fieldErrors.nextPassword}
                passwordConfirmError={fieldErrors.nextPasswordConfirm}
                resetExpiresAt={activeResetSession.expiresAt}
                resetExpiresIn={activeResetExpiresIn}
                onPasswordChange={(value) =>
                  isCompany
                    ? updateCompany('nextPassword', value)
                    : updateUser('nextPassword', value)
                }
                onPasswordConfirmChange={(value) =>
                  isCompany
                    ? updateCompany('nextPasswordConfirm', value)
                    : updateUser('nextPasswordConfirm', value)
                }
              />
            )}

            {formMessage && (
              <p className="cw-auth-message cw-auth-message--error" role="alert">
                <AlertCircle size={16} />
                {formMessage}
              </p>
            )}
            {successMessage && (
              <p className="cw-auth-feedback" role="status" aria-live="polite">
                <CheckCircle2 size={15} />
                {successMessage}
              </p>
            )}

            <button
              className="cw-auth-main-button"
              disabled={issuePasswordTokenPending || resetPasswordPending}
              type="button"
              onClick={hasResetToken ? handleResetPassword : handleIssueResetToken}
            >
              {hasResetToken
                ? resetPasswordPending
                  ? '저장 중'
                  : '새 비밀번호 저장'
                : issuePasswordTokenPending
                  ? '확인 중'
                  : '비밀번호 재설정 진행'}
            </button>
          </form>

          <div className="cw-auth-links">
            <Link to="/auth/find-account">선택 페이지로 돌아가기</Link>
            <span aria-hidden="true">|</span>
            <Link to={`/auth/find-id/${isCompany ? 'company' : 'user'}`}>아이디 찾기</Link>
            <span aria-hidden="true">|</span>
            <Link to="/auth/login">로그인</Link>
          </div>
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindPasswordPage;
