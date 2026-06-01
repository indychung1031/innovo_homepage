import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { register } from '@/api/auth';
import { AuthFormSection } from '@/components/auth/AuthFormSection';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName, PrivacyConsent } from '@/components/forms/PrivacyConsent';
import { mapAuthError } from '@/features/auth/mapAuthError';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { getRecaptchaToken, loadRecaptchaScript } from '@/lib/recaptcha';

export function RegisterPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('auth');
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void loadRecaptchaScript(recaptchaKey);
  }, [recaptchaKey]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);

    try {
      const message = await register({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirm: passwordConfirm,
        privacy_agreed: privacyAgreed,
        terms_agreed: termsAgreed,
        recaptcha_token: await getRecaptchaToken(recaptchaKey, 'register'),
        lang,
      });
      setAlert({ variant: 'success', message });
      setFullName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setPasswordConfirm('');
      setPrivacyAgreed(false);
      setTermsAgreed(false);
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      setAlert({ variant: 'error', message: mapAuthError(detail, t) });
    } finally {
      setSubmitting(false);
    }
  }

  const termsLabel = (
    <>
      <Link to={withLang(lang, '/terms')} className="text-sky" target="_blank" rel="noopener noreferrer">
        {lang === 'ko' ? '이용약관' : 'Terms of Service'}
      </Link>{' '}
      ({lang === 'ko' ? '필수' : 'required'})
    </>
  );

  return (
    <AuthFormSection
      title={t('register.title')}
      breadcrumbLabel={t('register.breadcrumb')}
      heading={t('register.heading')}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          type="text"
          required
          maxLength={50}
          placeholder={t('register.full_name')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClassName}
        />
        <input
          type="text"
          required
          maxLength={100}
          placeholder={t('register.company_name')}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className={inputClassName}
        />
        <input
          type="email"
          required
          placeholder={t('register.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
        />
        <input
          type="tel"
          required
          maxLength={30}
          placeholder={t('register.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClassName}
        />
        <input
          type="password"
          required
          placeholder={t('register.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClassName}
        />
        <input
          type="password"
          required
          placeholder={t('register.password_confirm')}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className={inputClassName}
        />
        <PrivacyConsent checked={privacyAgreed} onChange={setPrivacyAgreed} />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={termsAgreed}
            onChange={(e) => setTermsAgreed(e.target.checked)}
            required
            className="mt-1"
          />
          <span>{termsLabel}</span>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-navy py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('register.submit')}
        </button>
      </form>

      {alert ? <FormAlert variant={alert.variant} message={alert.message} /> : null}

      <p className="mt-4 text-sm">
        <Link to={withLang(lang, '/login')} className="text-sky">
          {t('register.login_link')}
        </Link>
      </p>
    </AuthFormSection>
  );
}
