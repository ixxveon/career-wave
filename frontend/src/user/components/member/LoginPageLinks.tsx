import { Link } from 'react-router-dom';

export function LoginPageLinks() {
  return (
    <div className="cw-auth-links">
      <Link to="/auth/find-account">아이디 찾기</Link>
      <span aria-hidden="true">|</span>
      <Link to="/auth/find-account">비밀번호 찾기</Link>
      <span aria-hidden="true">|</span>
      <Link to="/auth/register">회원가입</Link>
    </div>
  );
}
