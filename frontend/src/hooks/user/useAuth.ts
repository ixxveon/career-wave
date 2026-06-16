import { useState, useEffect } from 'react';
import { authSession, AUTH_CHANGE_EVENT } from '../../utils/user/member/authSession';
import { probeAuth } from '../../api/user/member/memberApiClient';
import { memberAuthApi } from '../../api/user/member/authApi';

function getIsLoggedIn() {
  return authSession.getAccessToken() !== null;
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(getIsLoggedIn);
  // 토큰이 없을 때만 cookie probe가 필요하다.
  const [isChecking, setIsChecking] = useState(() => !getIsLoggedIn());

  useEffect(() => {
    function sync() {
      setIsLoggedIn(getIsLoggedIn());
    }
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!isChecking) return;
    let cancelled = false;

    // Phase 3: HttpOnly cookie가 유효하면 accessToken을 복원한다.
    probeAuth().then((ok) => {
      if (!cancelled) {
        setIsLoggedIn(ok);
        setIsChecking(false);
      }
    });

    return () => { cancelled = true; };
  }, [isChecking]);

  function logout() {
    memberAuthApi.logout(); // 백엔드 logout API 호출 (refresh token 폐기) + authSession.clear()
    authSession.clear();    // 즉시 UI 상태 업데이트
    setIsChecking(false);
  }

  return { isLoggedIn, isChecking, logout };
}
