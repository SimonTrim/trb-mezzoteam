import { useCallback, useEffect, useState } from 'react';
import { getAuthStatus, getLoginUrl } from '@/api/proxyClient';
import type { AuthStatus } from '@/types';

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>({ authenticated: false });
  const [isChecking, setIsChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await getAuthStatus();
      setStatus(result);
    } catch {
      setStatus({ authenticated: false });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(() => {
    window.location.href = getLoginUrl();
  }, []);

  return { status, isChecking, login, refresh: checkAuth };
}
