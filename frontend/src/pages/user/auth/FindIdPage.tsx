import { useParams } from 'react-router-dom';
import { AlertCircle, Mail, Phone } from 'lucide-react';
import { useFindIdRecovery } from '../../../hooks/user/member';
import { RECOVERY_METHOD } from '../../../utils/user/member/recoverySchema';
import RecoveryCompanyIdentityFields from '../../../components/user/member/RecoveryCompanyIdentityFields';
import RecoveryMethodTabs from '../../../components/user/member/RecoveryMethodTabs';
import RecoveryPageLinks from '../../../components/user/member/RecoveryPageLinks';
import RecoverySupportPanel from '../../../components/user/member/RecoverySupportPanel';
import { PHONE_CONTACT_FIELD_PROPS, RecoveryCodeField, RecoveryContactField } from '../../../components/user/member/RecoveryVerificationFields';
import RecoveryResultPanel from '../../../components/user/member/RecoveryResultPanel';
import '@/styles/user/auth/AuthPage.css';

function FindIdPage() {
  const { roleType } = useParams();
  const isCompany = roleType === 'company';
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
    handleResetUserContact,
    handleResetCompanyContact,
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
          {!isCompany && <RecoveryMethodTabs method={userMethod} onChange={resetUserMethod} />}

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
                onReset={handleResetUserContact}
              />
            )}

            {!isCompany && userMethod === RECOVERY_METHOD.PHONE && (
              <RecoveryContactField
                label="휴대폰 번호"
                icon={<Phone size={18} />}
                value={userForm.phone}
                placeholder="휴대폰번호 숫자 입력"
                error={fieldErrors.phone}
                verification={activeUserVerification}
                feedbackText="휴대폰 인증번호가 발송되었습니다."
                sendPending={sendVerificationPending}
                resendIn={userResendIn}
                {...PHONE_CONTACT_FIELD_PROPS}
                onChange={(value) => updateUser('phone', value)}
                onSend={handleSendUserCode}
                onReset={handleResetUserContact}
              />
            )}

            {!isCompany && (
              <RecoveryCodeField
                label="인증번호 입력"
                code={userForm.code}
                error={fieldErrors.code}
                verification={activeUserVerification}
                expiresIn={userExpiresIn}
                confirmPending={confirmVerificationPending}
                onCodeChange={(value) => updateUser('code', value)}
                onConfirm={handleConfirmUserCode}
              />
            )}

            {isCompany && (
              <>
                <RecoveryCompanyIdentityFields
                  managerName={companyForm.managerName}
                  managerNameError={fieldErrors.managerName}
                  businessNumber={companyForm.businessNumber}
                  businessNumberError={fieldErrors.businessNumber}
                  onManagerNameChange={(value) => updateCompany('managerName', value)}
                  onBusinessNumberChange={(value) => updateCompany('businessNumber', value)}
                />
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
                  onReset={handleResetCompanyContact}
                />
                <RecoveryCodeField
                  label="이메일 인증번호 입력"
                  code={companyForm.code}
                  error={fieldErrors.code}
                  verification={companyVerification}
                  expiresIn={companyExpiresIn}
                  confirmPending={confirmVerificationPending}
                  onCodeChange={(value) => updateCompany('code', value)}
                  onConfirm={handleConfirmCompanyCode}
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
              loginIds={result.loginIds}
            />
          )}

          <RecoveryPageLinks
            links={[
              { to: '/auth/find-account', label: '선택 페이지로 돌아가기' },
              { to: `/auth/find-password/${isCompany ? 'company' : 'user'}`, label: '비밀번호 찾기' },
            ]}
          />
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindIdPage;
