import { useParams } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { useFindPasswordRecovery } from '../../../hooks/user/member';
import { RECOVERY_METHOD } from '../../../utils/user/member/recoverySchema';
import RecoveryCompanyIdentityFields from '../../../components/user/member/RecoveryCompanyIdentityFields';
import RecoveryLoginIdField from '../../../components/user/member/RecoveryLoginIdField';
import RecoveryMethodTabs from '../../../components/user/member/RecoveryMethodTabs';
import RecoveryPasswordActionArea from '../../../components/user/member/RecoveryPasswordActionArea';
import RecoveryPasswordFields from '../../../components/user/member/RecoveryPasswordFields';
import RecoveryPageLinks from '../../../components/user/member/RecoveryPageLinks';
import RecoverySupportPanel from '../../../components/user/member/RecoverySupportPanel';
import { RecoveryCodeField, RecoveryContactField } from '../../../components/user/member/RecoveryVerificationFields';
import '@/styles/user/auth/AuthPage.css';

function FindPasswordPage() {
  const { roleType } = useParams();
  const isCompany = roleType === 'company';
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
          {!isCompany && <RecoveryMethodTabs method={userMethod} onChange={resetUserMethod} />}

          <form className="cw-auth-form" noValidate>
            {!isCompany && (
              <RecoveryLoginIdField
                value={userForm.loginId}
                error={fieldErrors.loginId}
                onChange={(value) => updateUser('loginId', value)}
              />
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
                <RecoveryCompanyIdentityFields
                  loginId={companyForm.loginId}
                  loginIdError={fieldErrors.loginId}
                  managerName={companyForm.managerName}
                  managerNameError={fieldErrors.managerName}
                  businessNumber={companyForm.businessNumber}
                  businessNumberError={fieldErrors.businessNumber}
                  onLoginIdChange={(value) => updateCompany('loginId', value)}
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

            <RecoveryPasswordActionArea
              formMessage={formMessage}
              successMessage={successMessage}
              hasResetToken={hasResetToken}
              issuePasswordTokenPending={issuePasswordTokenPending}
              resetPasswordPending={resetPasswordPending}
              onSubmit={hasResetToken ? handleResetPassword : handleIssueResetToken}
            />
          </form>

          <RecoveryPageLinks
            links={[
              { to: '/auth/find-account', label: '선택 페이지로 돌아가기' },
              { to: `/auth/find-id/${isCompany ? 'company' : 'user'}`, label: '아이디 찾기' },
              { to: '/auth/login', label: '로그인' },
            ]}
          />
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindPasswordPage;
