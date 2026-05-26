import { useNavigate } from 'react-router-dom';
import '../../styles/admin-login.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/admin/dashboard');
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginLogo">CAREER WAVE ADMIN</div>

        <h1>관리자 로그인</h1>

        <p className="loginDesc">관리자 계정으로 로그인하세요.</p>

        <form onSubmit={handleLogin} style={{ display: 'contents' }}>
          <input type="email" placeholder="이메일" required />
          <input type="password" placeholder="비밀번호" required />
          <button type="submit" className="loginSubmitBtn">로그인</button>
        </form>

        <div className="loginLinks">
          <button type="button">비밀번호 찾기</button>
        </div>
      </div>
    </div>
  );
}
