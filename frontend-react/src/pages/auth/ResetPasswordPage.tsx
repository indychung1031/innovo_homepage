import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { resetPassword } from '@/api/auth';
import { AuthFormSection } from '@/components/auth/AuthFormSection';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName } from '@/components/forms/PrivacyConsent';
import { mapAuthError } from '@/features/auth/mapAuthError';
export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setAlert({ variant: 'error', message: t('reset.missing_token') });
      return;
    }

    setAlert(null);
    setSubmitting(true);

    try {
      const message = await resetPassword(token, newPassword, confirmPassword);
      setAlert({ variant: 'success', message });
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setAlert({ variant: 'error', message: mapAuthError(detail, t) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormSection title={t('reset.title')} breadcrumbLabel={t('reset.breadcrumb')} heading={t('reset.heading')}>
      {!token ? <FormAlert variant="error" message={t('reset.missing_token')} /> : null}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="password"
          required
          placeholder={t('reset.new_password')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClassName}
        />
        <input
          type="password"
          required
          placeholder={t('reset.confirm_password')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClassName}
        />
        <button
          type="submit"
          disabled={submitting || !token}
          className="w-full rounded bg-navy py-3 text-white disabled:opacity-60"
        >
          {t('reset.submit')}
        </button>
      </form>
      {alert ? <FormAlert variant={alert.variant} message={alert.message} /> : null}
    </AuthFormSection>
  );
}
