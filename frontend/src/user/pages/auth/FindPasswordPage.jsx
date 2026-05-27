import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, LockKeyhole, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import RecoverySupportPanel from './RecoverySupportPanel';
import './AuthPage.css';

function FindPasswordPage() {
  const { memberType } = useParams();
  const isCompany = memberType === 'company';

  const [userMethod, setUserMethod] = useState('email');
  const [userForm, setUserForm] = useState({
    loginId: '',
    email: '',
    phone: '',
    code: '',
    nextPassword: '',
    nextPasswordConfirm: '',
  });
  const [userStatus, setUserStatus] = useState({
    sent: false,
    verified: false,
    resetDone: false,
  });

  const [companyForm, setCompanyForm] = useState({
    loginId: '',
    managerName: '',
    businessNumber: '',
    email: '',
    code: '',
    nextPassword: '',
    nextPasswordConfirm: '',
  });
  const [companyStatus, setCompanyStatus] = useState({
    sent: false,
    verified: false,
    resetDone: false,
  });

  const userPasswordMismatch = userForm.nextPasswordConfirm && userForm.nextPassword !== userForm.nextPasswordConfirm;
  const companyPasswordMismatch =
    companyForm.nextPasswordConfirm && companyForm.nextPassword !== companyForm.nextPasswordConfirm;

  const updateUser = (key, value) => {
    setUserForm((current) => ({ ...current, [key]: value }));
  };

  const updateCompany = (key, value) => {
    setCompanyForm((current) => ({ ...current, [key]: value }));
  };

  const handleReset = () => {
    if (isCompany) {
      if (!companyStatus.verified || companyPasswordMismatch) return;
      setCompanyStatus((current) => ({ ...current, resetDone: true }));
      return;
    }

    if (!userStatus.verified || userPasswordMismatch) return;
    setUserStatus((current) => ({ ...current, resetDone: true }));
  };

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
                className={userMethod === 'email' ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={userMethod === 'email'}
                onClick={() => setUserMethod('email')}
              >
                이메일로 인증
              </button>
              <button
                className={userMethod === 'phone' ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={userMethod === 'phone'}
                onClick={() => setUserMethod('phone')}
              >
                휴대폰 번호로 인증
              </button>
            </div>
          )}

          <form className="cw-auth-form">
            {!isCompany && (
              <label>
                아이디
                <span>
                  <UserRound size={18} />
                  <input
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={userForm.loginId}
                    onChange={(event) => updateUser('loginId', event.target.value)}
                  />
                </span>
              </label>
            )}

            {!isCompany && userMethod === 'email' && (
              <label>
                이메일
                <div className="cw-auth-inline">
                  <span>
                    <Mail size={18} />
                    <input
                      type="email"
                      placeholder="이메일 주소 입력"
                      value={userForm.email}
                      onChange={(event) => updateUser('email', event.target.value)}
                    />
                  </span>
                  <button
                    className="cw-auth-sub-button cw-auth-sub-button--send"
                    type="button"
                    onClick={() => setUserStatus((current) => ({ ...current, sent: true }))}
                  >
                    인증번호 전송
                  </button>
                </div>
                {userStatus.sent && (
                  <span className="cw-auth-feedback">
                    <CheckCircle2 size={15} />
                    이메일 인증번호가 발송되었습니다.
                  </span>
                )}
              </label>
            )}

            {!isCompany && userMethod === 'phone' && (
              <label>
                휴대폰 번호
                <div className="cw-auth-inline">
                  <span>
                    <Phone size={18} />
                    <input
                      type="tel"
                      placeholder="휴대폰번호('-' 없이 숫자만 입력)"
                      value={userForm.phone}
                      onChange={(event) => updateUser('phone', event.target.value)}
                    />
                  </span>
                  <button
                    className="cw-auth-sub-button"
                    type="button"
                    onClick={() => setUserStatus((current) => ({ ...current, sent: true }))}
                  >
                    인증번호 전송
                  </button>
                </div>
                {userStatus.sent && (
                  <span className="cw-auth-feedback">
                    <CheckCircle2 size={15} />
                    휴대폰 인증번호가 발송되었습니다.
                  </span>
                )}
              </label>
            )}

            {!isCompany && (
              <>
                <label>
                  인증번호 입력
                  <div className="cw-auth-inline cw-auth-inline--triple">
                    <span>
                      <CheckCircle2 size={18} />
                      <input
                        type="text"
                        placeholder="인증번호 6자리 입력"
                        value={userForm.code}
                        onChange={(event) => updateUser('code', event.target.value)}
                      />
                    </span>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--confirm"
                      type="button"
                      onClick={() => setUserStatus((current) => ({ ...current, verified: true }))}
                    >
                      인증 확인
                    </button>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--resend"
                      type="button"
                      onClick={() => setUserStatus((current) => ({ ...current, sent: true }))}
                    >
                      재전송
                    </button>
                  </div>
                </label>
                {userStatus.verified && (
                  <span className="cw-auth-feedback">
                    <CheckCircle2 size={15} />
                    인증이 완료되었습니다.
                  </span>
                )}
                <label>
                  새 비밀번호
                  <span>
                    <LockKeyhole size={18} />
                    <input
                      type="password"
                      placeholder="비밀번호(8~16자의 영문, 숫자, 특수기호)"
                      value={userForm.nextPassword}
                      onChange={(event) => updateUser('nextPassword', event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  새 비밀번호 확인
                  <span>
                    <LockKeyhole size={18} />
                    <input
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={userForm.nextPasswordConfirm}
                      onChange={(event) => updateUser('nextPasswordConfirm', event.target.value)}
                    />
                  </span>
                  {userPasswordMismatch && <p className="cw-register-error">비밀번호가 일치하지 않습니다.</p>}
                </label>
              </>
            )}

            {isCompany && (
              <>
                <label>
                  아이디
                  <span>
                    <UserRound size={18} />
                    <input
                      type="text"
                      placeholder="아이디를 입력하세요"
                      value={companyForm.loginId}
                      onChange={(event) => updateCompany('loginId', event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  담당자명
                  <span>
                    <UserRound size={18} />
                    <input
                      type="text"
                      placeholder="담당자명(실명)"
                      value={companyForm.managerName}
                      onChange={(event) => updateCompany('managerName', event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  사업자등록번호
                  <span>
                    <Building2 size={18} />
                    <input
                      type="text"
                      placeholder="사업자등록번호('-' 없이 숫자만 입력)"
                      value={companyForm.businessNumber}
                      onChange={(event) => updateCompany('businessNumber', event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  담당자 이메일
                  <div className="cw-auth-inline">
                    <span>
                      <Mail size={18} />
                      <input
                        type="email"
                        placeholder="담당자 이메일 주소 입력"
                        value={companyForm.email}
                        onChange={(event) => updateCompany('email', event.target.value)}
                      />
                    </span>
                    <button
                      className="cw-auth-sub-button cw-auth-sub-button--send"
                      type="button"
                      onClick={() => setCompanyStatus((current) => ({ ...current, sent: true }))}
                    >
                      인증번호 전송
                    </button>
                  </div>
                  {companyStatus.sent && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      이메일 인증번호가 발송되었습니다.
                    </span>
                  )}
                </label>
                <label>
                  이메일 인증번호 입력
                  <div className="cw-auth-inline cw-auth-inline--triple">
                    <span>
                      <CheckCircle2 size={18} />
                      <input
                        type="text"
                        placeholder="인증번호 6자리 입력"
                        value={companyForm.code}
                        onChange={(event) => updateCompany('code', event.target.value)}
                      />
                    </span>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--confirm"
                      type="button"
                      onClick={() => setCompanyStatus((current) => ({ ...current, verified: true }))}
                    >
                      인증 확인
                    </button>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--resend"
                      type="button"
                      onClick={() => setCompanyStatus((current) => ({ ...current, sent: true }))}
                    >
                      재전송
                    </button>
                  </div>
                </label>
                {companyStatus.verified && (
                  <span className="cw-auth-feedback">
                    <CheckCircle2 size={15} />
                    인증이 완료되었습니다.
                  </span>
                )}
                <label>
                  새 비밀번호
                  <span>
                    <LockKeyhole size={18} />
                    <input
                      type="password"
                      placeholder="비밀번호(8~16자의 영문, 숫자, 특수기호)"
                      value={companyForm.nextPassword}
                      onChange={(event) => updateCompany('nextPassword', event.target.value)}
                    />
                  </span>
                </label>
                <label>
                  새 비밀번호 확인
                  <span>
                    <LockKeyhole size={18} />
                    <input
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={companyForm.nextPasswordConfirm}
                      onChange={(event) => updateCompany('nextPasswordConfirm', event.target.value)}
                    />
                  </span>
                  {companyPasswordMismatch && <p className="cw-register-error">비밀번호가 일치하지 않습니다.</p>}
                </label>
              </>
            )}

            <button
              className="cw-auth-main-button"
              type="button"
              onClick={handleReset}
            >
              비밀번호 재설정
            </button>
          </form>

          {!isCompany && userStatus.resetDone && <p className="cw-auth-result">비밀번호가 재설정되었습니다. 로그인해주세요.</p>}
          {isCompany && companyStatus.resetDone && <p className="cw-auth-result">비밀번호가 재설정되었습니다. 로그인해주세요.</p>}

          <div className="cw-auth-links">
            <Link to="/auth/find-account">선택 페이지로 돌아가기</Link>
            <span aria-hidden="true">|</span>
            <Link to={`/auth/find-id/${isCompany ? 'company' : 'user'}`}>아이디 찾기</Link>
          </div>
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindPasswordPage;
