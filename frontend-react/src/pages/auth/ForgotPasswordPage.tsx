import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { forgotPassword } from '@/api/auth';
import { AuthFormSection } from '@/components/auth/AuthFormSection';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName } from '@/components/forms/PrivacyConsent';
import { mapAuthError } from '@/features/auth/mapAuthError';
import { isLangCode, type LangCode } from '@/lib/lang';

export function ForgotPasswordPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('auth');

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);

    try {
      const message = await forgotPassword(email.trim(), lang);
      setAlert({ variant: 'success', message });
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setAlert({ variant: 'error', message: mapAuthError(detail, t) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormSection title={t('forgot.title')} breadcrumbLabel={t('forgot.breadcrumb')} heading={t('forgot.heading')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder={t('forgot.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-navy py-3 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('forgot.submit')}
        </button>
      </form>
      {alert ? <FormAlert variant={alert.variant} message={alert.message} /> : null}
    </AuthFormSection>
  );
}
