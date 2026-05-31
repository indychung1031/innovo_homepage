import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  fetchMe,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  type UserPublic,
} from '@/api/auth';
import { setAccessToken } from '@/lib/authSession';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

type AuthContextValue = {
  user: UserPublic | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<UserPublic>;
  logout: () => Promise<void>;
  refresh: () => Promise<UserPublic | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async (): Promise<UserPublic | null> => {
    try {
      await refreshSession();
      const me = await fetchMe();
      setUser(me);
      setStatus('authenticated');
      return me;
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus('guest');
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await apiLogin(email, password);
    setUser(loggedIn);
    setStatus('authenticated');
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, refresh }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
