import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AuthFormSection } from '@/components/auth/AuthFormSection';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName } from '@/components/forms/PrivacyConsent';
import { useAuth } from '@/features/auth/AuthContext';
import { mapAuthError } from '@/features/auth/mapAuthError';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

function safeNextPath(next: string | null, lang: LangCode): string | null {
  if (!next || !next.startsWith('/')) {
    return null;
  }
  const prefix = `/${lang}/`;
  if (!next.startsWith(prefix) && next !== `/${lang}`) {
    return null;
  }
  return next;
}

export function LoginPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('auth');
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const nextPath = safeNextPath(searchParams.get('next'), lang);

  useEffect(() => {
    if (user && nextPath) {
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      if (nextPath) {
        navigate(nextPath, { replace: true });
        return;
      }
      setAlert({ variant: 'success', message: t('login.success') });
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setAlert({ variant: 'error', message: mapAuthError(detail, t) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormSection title={t('login.title')} breadcrumbLabel={t('login.breadcrumb')} heading={t('login.heading')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
            {t('login.email')}
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium">
            {t('login.password')}
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-navy py-3 font-medium text-white disabled:opacity-60"
        >
          {t('login.submit')}
        </button>
      </form>

      {alert ? <FormAlert variant={alert.variant} message={alert.message} /> : null}

      <p className="mt-6 space-y-2 text-sm">
        <Link to={withLang(lang, '/register')} className="block text-sky">
          {t('login.register_link')}
        </Link>
        <Link to={withLang(lang, '/forgot-password')} className="block text-sky">
          {t('login.forgot_link')}
        </Link>
      </p>
    </AuthFormSection>
  );
}
