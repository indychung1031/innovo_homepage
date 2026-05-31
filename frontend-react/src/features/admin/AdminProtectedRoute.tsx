import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAdminAuth } from '@/features/admin/AdminAuthContext';
import { getAdminToken } from '@/lib/adminSession';

type AdminProtectedRouteProps = {
  children: ReactNode;
};

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { staff, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-gray-mid">
        …
      </div>
    );
  }

  if (!staff && !getAdminToken()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
