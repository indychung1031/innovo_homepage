import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

type ProtectedRouteProps = {
  children: ReactNode;
};

/** 미로그인 시 /:lang/login?next=... 리다이렉트 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, status } = useAuth();
  const { lang: langParam } = useParams();
  const location = useLocation();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';

  if (status === 'loading') {
    return (
      <section className="mx-auto max-w-md px-4 py-16 text-center text-gray-mid">
        …
      </section>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`${withLang(lang, '/login')}?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
