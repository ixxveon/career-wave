import { Link } from 'react-router-dom';
import { Building2, UserRound } from 'lucide-react';
import './AuthPage.css';

function FindAccountPage() {
  return (
    <section className="cw-auth-page cw-auth-page--recovery">
      <div className="cw-auth-recovery">
        <div className="cw-auth-recovery__hero">
          <p className="cw-auth-eyebrow">FIND ACCOUNT</p>
          <h1>아이디/비밀번호 찾기</h1>
          <p>가입한 회원 유형과 찾을 항목을 선택해주세요.</p>
        </div>

        <div className="cw-auth-choice-grid">
          <div className="cw-auth-card cw-auth-card--recovery cw-auth-choice-card">
            <div className="cw-auth-choice-card__head">
              <div className="cw-auth-choice-card__icon">
                <UserRound size={24} />
              </div>
              <div>
                <h2>개인회원</h2>
                <p>개인회원은 이메일 또는 휴대폰 인증으로 계정을 찾을 수 있습니다.</p>
              </div>
            </div>
            <div className="cw-auth-choice-card__actions">
              <Link className="cw-auth-choice-button" to="/auth/find-id/user">
                아이디 찾기
              </Link>
              <Link className="cw-auth-choice-button" to="/auth/find-password/user">
                비밀번호 찾기
              </Link>
            </div>
          </div>

          <div className="cw-auth-card cw-auth-card--recovery cw-auth-choice-card">
            <div className="cw-auth-choice-card__head">
              <div className="cw-auth-choice-card__icon">
                <Building2 size={24} />
              </div>
              <div>
                <h2>기업회원</h2>
                <p>기업회원은 담당자 정보와 사업자등록번호로 계정을 찾을 수 있습니다.</p>
              </div>
            </div>
            <div className="cw-auth-choice-card__actions">
              <Link className="cw-auth-choice-button" to="/auth/find-id/company">
                아이디 찾기
              </Link>
              <Link className="cw-auth-choice-button" to="/auth/find-password/company">
                비밀번호 찾기
              </Link>
            </div>
          </div>
        </div>

        <div className="cw-auth-links">
          <Link to="/auth/login">로그인</Link>
          <span aria-hidden="true">|</span>
          <Link to="/auth/register">회원가입</Link>
        </div>
      </div>
    </section>
  );
}

export default FindAccountPage;
