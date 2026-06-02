import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import { useFindIdRecovery } from '../../hooks/member';
import { RECOVERY_METHOD } from '../../utils/member/recoverySchema';
import { RecoveryCodeField, RecoveryContactField } from '../../components/member/RecoveryVerificationFields';
import RecoveryResultPanel from '../../components/member/RecoveryResultPanel';
import RecoverySupportPanel from './RecoverySupportPanel';
import './AuthPage.css';

function FindIdPage() {
  const { memberType } = useParams();
  const isCompany = memberType === 'company';
  const {
    userMethod,
    userForm,
    companyForm,
    fieldErrors,
    formMessage,
    result,
    activeUserVerification,
    companyVerification,
    userExpiresIn,
    userResendIn,
    companyExpiresIn,
    companyResendIn,
    sendVerificationPending,
    confirmVerificationPending,
    findIdPending,
    updateUser,
    updateCompany,
    resetUserMethod,
    handleSendUserCode,
    handleConfirmUserCode,
    handleSendCompanyCode,
    handleConfirmCompanyCode,
    handleFindId,
  } = useFindIdRecovery(isCompany);

  return (
    <section className="cw-auth-page cw-auth-page--recovery">
      <div className="cw-auth-recovery cw-auth-recovery--detail">
        <div className="cw-auth-recovery__hero">
          <p className="cw-auth-eyebrow">FIND ID</p>
          <h1>{isCompany ? '기업회원 아이디 찾기' : '개인회원 아이디 찾기'}</h1>
          <p>
            {isCompany
              ? '담당자 정보와 사업자등록번호, 이메일 인증으로 아이디를 찾을 수 있습니다.'
              : '가입 시 등록한 이메일 또는 휴대폰 번호로 아이디를 찾을 수 있습니다.'}
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

            {formMessage && (
              <p className="cw-auth-message cw-auth-message--error" role="alert">
                <AlertCircle size={16} />
                {formMessage}
              </p>
            )}

            <button
              className="cw-auth-main-button"
              disabled={findIdPending}
              type="button"
              onClick={handleFindId}
            >
              {findIdPending ? '확인 중' : '아이디 찾기'}
            </button>
          </form>

          {result.submitted && (
            <RecoveryResultPanel
              found={result.found}
              maskedLoginIds={result.maskedLoginIds}
            />
          )}

          <div className="cw-auth-links">
            <Link to="/auth/find-account">선택 페이지로 돌아가기</Link>
            <span aria-hidden="true">|</span>
            <Link to={`/auth/find-password/${isCompany ? 'company' : 'user'}`}>비밀번호 찾기</Link>
          </div>
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindIdPage;
