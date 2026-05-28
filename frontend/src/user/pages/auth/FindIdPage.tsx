import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import RecoverySupportPanel from './RecoverySupportPanel';
import './AuthPage.css';

interface UserForm {
  email: string;
  phone: string;
  code: string;
}

interface CompanyForm {
  managerName: string;
  businessNumber: string;
  email: string;
  code: string;
}

function FindIdPage() {
  const { memberType } = useParams();
  const isCompany = memberType === 'company';

  const [userMethod, setUserMethod] = useState('email');
  const [userForm, setUserForm] = useState<UserForm>({
    email: '',
    phone: '',
    code: '',
  });
  const [userStatus, setUserStatus] = useState({
    sent: false,
    verified: false,
    result: false,
  });

  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    managerName: '',
    businessNumber: '',
    email: '',
    code: '',
  });
  const [companyStatus, setCompanyStatus] = useState({
    sent: false,
    verified: false,
    result: false,
  });

  const updateUser = (key: keyof UserForm, value: string) => {
    setUserForm((current) => ({ ...current, [key]: value }));
  };

  const updateCompany = (key: keyof CompanyForm, value: string) => {
    setCompanyForm((current) => ({ ...current, [key]: value }));
  };

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
              </>
            )}

            {isCompany && (
              <>
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
              </>
            )}

            <button
              className="cw-auth-main-button"
              type="button"
              onClick={() =>
                isCompany
                  ? setCompanyStatus((current) => ({ ...current, result: true }))
                  : setUserStatus((current) => ({ ...current, result: true }))
              }
            >
              아이디 찾기
            </button>
          </form>

          {!isCompany && userStatus.result && <p className="cw-auth-result">가입된 아이디는 careerwave01 입니다.</p>}
          {isCompany && companyStatus.result && <p className="cw-auth-result">가입된 기업회원 아이디는 companywave01 입니다.</p>}

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
