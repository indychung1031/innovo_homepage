import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { LangShell } from '@/components/layout/LangShell';
import { AdminProtectedRoute } from '@/features/admin/AdminProtectedRoute';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AboutPage } from '@/pages/AboutPage';
import { AdminContactDetailPage } from '@/pages/admin/AdminContactDetailPage';
import { AdminContactsPage } from '@/pages/admin/AdminContactsPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminQuoteDetailPage } from '@/pages/admin/AdminQuoteDetailPage';
import { AdminQuotesPage } from '@/pages/admin/AdminQuotesPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminWizardQuoteDetailPage } from '@/pages/admin/AdminWizardQuoteDetailPage';
import { AdminWizardQuotesPage } from '@/pages/admin/AdminWizardQuotesPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ContactPage } from '@/pages/ContactPage';
import { HomePage } from '@/pages/HomePage';
import { LegalDocumentPage } from '@/pages/legal/LegalDocumentPage';
import { QuickQuotePage } from '@/pages/QuickQuotePage';
import { QuoteWizardPage } from '@/pages/quote-wizard/QuoteWizardPage';
import { ProbePinCustomPage } from '@/pages/products/ProbePinCustomPage';
import { ProbePinGeneralPage } from '@/pages/products/ProbePinGeneralPage';
import { ProbePinSpecialPage } from '@/pages/products/ProbePinSpecialPage';
import { ProductCategoryPage } from '@/pages/products/ProductCategoryPage';
import { ProductsIndexPage } from '@/pages/products/ProductsIndexPage';
import { AccountPage } from '@/pages/AccountPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RootRedirect } from '@/pages/RootRedirect';
import { TechnologyPage } from '@/pages/TechnologyPage';

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/:lang',
    element: <LangShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'products', element: <ProductsIndexPage /> },
      { path: 'products/probe-pin/general', element: <ProbePinGeneralPage /> },
      { path: 'products/probe-pin/special', element: <ProbePinSpecialPage /> },
      { path: 'products/probe-pin/custom', element: <ProbePinCustomPage /> },
      { path: 'products/:categorySlug', element: <ProductCategoryPage /> },
      { path: 'technology', element: <TechnologyPage /> },
      { path: 'contact', element: <ContactPage /> },
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      },
      { path: 'quote', element: <QuickQuotePage /> },
      {
        path: 'quote/wizard',
        element: (
          <ProtectedRoute>
            <QuoteWizardPage />
          </ProtectedRoute>
        ),
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'privacy', element: <LegalDocumentPage kind="privacy" /> },
      { path: 'terms', element: <LegalDocumentPage kind="terms" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/en" replace /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <AdminLayout />
      </AdminProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'quotes', element: <AdminQuotesPage /> },
      { path: 'quotes/:id', element: <AdminQuoteDetailPage /> },
      { path: 'wizard-quotes', element: <AdminWizardQuotesPage /> },
      { path: 'wizard-quotes/:id', element: <AdminWizardQuoteDetailPage /> },
      { path: 'contacts', element: <AdminContactsPage /> },
      { path: 'contacts/:id', element: <AdminContactDetailPage /> },
      { path: 'users', element: <AdminUsersPage /> },
    ],
  },
]);
