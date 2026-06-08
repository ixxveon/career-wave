import { useState, useEffect } from 'react';
import { authSession, AUTH_CHANGE_EVENT } from '../user/utils/member/authSession';

function getIsLoggedIn() {
  return !!(authSession.getAccessToken() || authSession.getRefreshToken());
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(getIsLoggedIn);

  useEffect(() => {
    function sync() {
      setIsLoggedIn(getIsLoggedIn());
    }
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, sync);
  }, []);

  function logout() {
    authSession.clear();
  }

  return { isLoggedIn, logout };
}
