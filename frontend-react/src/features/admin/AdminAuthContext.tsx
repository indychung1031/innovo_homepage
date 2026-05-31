import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { adminFetchMe, adminLogout, type AdminStaff } from '@/api/admin';
import { getAdminToken } from '@/lib/adminSession';

type AdminAuthContextValue = {
  staff: AdminStaff | null;
  loading: boolean;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<AdminStaff | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getAdminToken()) {
      setStaff(null);
      setLoading(false);
      return;
    }
    try {
      const me = await adminFetchMe();
      setStaff(me);
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    adminLogout();
    setStaff(null);
  }, []);

  const value = useMemo(() => ({ staff, loading, logout, refresh }), [staff, loading, logout, refresh]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}
