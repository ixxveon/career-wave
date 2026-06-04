import { useState } from 'react';
import { CompanyRegisterForm } from '../../components/member/CompanyRegisterForm';
import { PersonalRegisterForm } from '../../components/member/PersonalRegisterForm';
import { COMPANY_TYPE_LABELS } from '../../utils/member/registerSchema';
import { companyTermDetails, personalTermDetails } from '../../utils/member/registerTerms';
import './AuthPage.css';

const companyTypes = Object.values(COMPANY_TYPE_LABELS);

function RegisterPage() {
  const [registerType, setRegisterType] = useState<'personal' | 'company'>('personal');

  return (
    <section className="cw-auth-page cw-register-page">
      <div className="cw-register-shell">
        <div className="cw-register-hero">
          <p className="cw-auth-eyebrow">CAREER WAVE SIGN UP</p>
          <h1>Career Wave 회원가입</h1>
          <p>개인회원은 AI 취업 준비를, 기업회원은 채용 관리와 인재 매칭을 바로 시작할 수 있습니다.</p>
        </div>

        <div className="cw-register-tabs" role="tablist" aria-label="회원가입 유형">
          <button
            aria-selected={registerType === 'personal'}
            className={registerType === 'personal' ? 'is-active' : ''}
            onClick={() => setRegisterType('personal')}
            role="tab"
            type="button"
          >
            개인회원
          </button>
          <button
            aria-selected={registerType === 'company'}
            className={registerType === 'company' ? 'is-active' : ''}
            onClick={() => setRegisterType('company')}
            role="tab"
            type="button"
          >
            기업회원
          </button>
        </div>

        {registerType === 'personal' ? (
          <PersonalRegisterForm termDetails={personalTermDetails} />
        ) : (
          <CompanyRegisterForm companyTypes={companyTypes} termDetails={companyTermDetails} />
        )}

        <p className="cw-auth-bottom-text">
          이미 계정이 있나요? <a href="/auth/login">로그인</a>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
