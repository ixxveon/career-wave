import { useSearchParams } from 'react-router-dom';
import { Building2, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import './AuthPage.css';

function RegisterVerifyPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') === 'company' ? 'company' : 'personal';
  const isCompany = type === 'company';

  return (
    <section className="cw-auth-page">
      <div className="cw-auth-card">
        <p className="cw-auth-eyebrow">VERIFY ACCOUNT</p>
        <h1>{isCompany ? '기업회원 인증' : '개인회원 인증'}</h1>
        <p>
          {isCompany
            ? '기업 담당자 정보를 확인하고 기업회원 가입을 완료합니다.'
            : '본인 정보를 확인하고 개인회원 가입을 완료합니다.'}
        </p>

        <form className="cw-auth-form">
          <label>
            {isCompany ? '담당자명' : '이름'}
            <span>
              <UserRound size={18} />
              <input type="text" placeholder={isCompany ? '담당자명을 입력하세요' : '이름을 입력하세요'} />
            </span>
          </label>
          {isCompany && (
            <label>
              회사명
              <span>
                <Building2 size={18} />
                <input type="text" placeholder="회사명을 입력하세요" />
              </span>
            </label>
          )}
          <label>
            휴대폰 인증
            <span>
              <Phone size={18} />
              <input type="tel" placeholder="010-0000-0000" />
            </span>
          </label>
          <label>
            이메일
            <span>
              <Mail size={18} />
              <input type="email" placeholder="career@wave.com" />
            </span>
          </label>
          <label>
            비밀번호
            <span>
              <LockKeyhole size={18} />
              <input type="password" placeholder="8자 이상 입력하세요" />
            </span>
          </label>
          <button type="button">{isCompany ? '기업회원 가입 완료' : '개인회원 가입 완료'}</button>
        </form>

        <div className="cw-auth-links">
          <a href="/auth/register">회원 유형 다시 선택</a>
          <a href="/auth/login">로그인</a>
        </div>
      </div>
    </section>
  );
}

export default RegisterVerifyPage;
