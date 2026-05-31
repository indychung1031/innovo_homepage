import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';

import { AdminAuthProvider } from '@/features/admin/AdminAuthContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { useCookieConsentInit } from '@/hooks/useCookieConsentInit';
import '@/i18n';

function ConsentBootstrap({ children }: { children: ReactNode }) {
  useCookieConsentInit();
  return children;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminAuthProvider>
            <ConsentBootstrap>{children}</ConsentBootstrap>
          </AdminAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
