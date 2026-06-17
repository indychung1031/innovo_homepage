import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { submitQuickQuote } from '@/api/quickQuote';
import { useAuth } from '@/features/auth/AuthContext';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName, PrivacyConsent } from '@/components/forms/PrivacyConsent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { getRecaptchaToken, loadRecaptchaScript } from '@/lib/recaptcha';

const PACKAGE_TYPES = ['WLP', 'BGA', 'QFN', 'QFP', 'SOP'] as const;
const PITCH_OPTIONS = ['0.4mm', '0.5mm', '0.65mm', '0.8mm', '1.0mm', 'custom'] as const;

export function QuickQuotePage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';
  const { t } = useTranslation(['quote', 'common']);
  const { user } = useAuth();
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
  const [searchParams] = useSearchParams();

  const [icPackageType, setIcPackageType] = useState(searchParams.get('ic_package_type') ?? '');
  const [icType, setIcType] = useState(searchParams.get('ic_type') ?? '');
  const [icCode, setIcCode] = useState(searchParams.get('ic_code') ?? '');
  const [pinCount, setPinCount] = useState(searchParams.get('pin_count') ?? '');
  const [pitch, setPitch] = useState(searchParams.get('pitch') ?? '');
  const [pitchCustom, setPitchCustom] = useState('');
  const [packageD, setPackageD] = useState(searchParams.get('package_d') ?? '');
  const [packageE, setPackageE] = useState(searchParams.get('package_e') ?? '');
  const [packageA, setPackageA] = useState(searchParams.get('package_a') ?? '');
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [quantity, setQuantity] = useState('');
  const [desiredDelivery, setDesiredDelivery] = useState('');
  const [message, setMessage] = useState('');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void loadRecaptchaScript(recaptchaKey);
  }, [recaptchaKey]);

  function resolvePitch(): string {
    return pitch === 'custom' ? pitchCustom.trim() : pitch;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);

    try {
      const token = await getRecaptchaToken(recaptchaKey, 'quick_quote');
      const result = await submitQuickQuote({
        ic_package_type: icPackageType,
        ic_type: icType.trim() || null,
        ic_code: icCode.trim() || null,
        pin_count: parseInt(pinCount, 10),
        pitch: resolvePitch(),
        package_d: parseFloat(packageD),
        package_e: parseFloat(packageE),
        package_a: packageA ? parseFloat(packageA) : null,
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || null,
        quantity: quantity ? parseInt(quantity, 10) : null,
        desired_delivery: desiredDelivery || null,
        message: message.trim() || null,
        privacy_agreed: privacyAgreed,
        recaptcha_token: token,
        lang,
      });
      setAlert({ variant: 'success', message: result.message });
      setIcPackageType('');
      setIcType('');
      setIcCode('');
      setPinCount('');
      setPitch('');
      setPitchCustom('');
      setPackageD('');
      setPackageE('');
      setPackageA('');
      setCompanyName('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setQuantity('');
      setDesiredDelivery('');
      setMessage('');
      setPrivacyAgreed(false);
    } catch (err) {
      setAlert({
        variant: 'error',
        message: err instanceof Error ? err.message : 'Submit failed',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>{t('quote:title')} | Innovo Solution</title>
      </Helmet>

      <section className="mx-auto max-w-2xl px-4 py-12">
        <Breadcrumb items={[{ label: t('common:nav.quote') }]} />
        <h1 className="mb-3 text-3xl font-bold">{t('quote:title')}</h1>
        <p className={`text-gray-mid ${user ? 'mb-4' : 'mb-8'}`}>
          {t('quote:subtitle')}
        </p>
        {user ? (
          <p className="mb-8 text-sm">
            {t('quote:wizard_hint_before')}
            <Link to={withLang(lang, '/quote/wizard')} className="font-medium text-sky">
              {t('quote:wizard_link')}
            </Link>
            {t('quote:wizard_hint_after')}
          </p>
        ) : null}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <fieldset className="rounded-lg border border-gray-light p-4">
            <legend className="px-1 font-semibold text-navy">
              {t('quote:sections.ic_spec')}
            </legend>
            <label className="mb-1 mt-2 block text-sm font-medium" htmlFor="ic_package_type">
              {t('quote:fields.package_type')} *
            </label>
            <select
              id="ic_package_type"
              required
              value={icPackageType}
              onChange={(e) => setIcPackageType(e.target.value)}
              className={`${inputClassName} mb-3`}
            >
              <option value="">—</option>
              {PACKAGE_TYPES.map((pkg) => (
                <option key={pkg} value={pkg}>
                  {pkg}
                </option>
              ))}
            </select>
            <label className="mb-1 block text-sm font-medium" htmlFor="ic_type">
              {t('quote:fields.ic_type')}
            </label>
            <input
              id="ic_type"
              type="text"
              maxLength={50}
              placeholder={t('quote:fields.ic_type_placeholder')}
              value={icType}
              onChange={(e) => setIcType(e.target.value)}
              className={`${inputClassName} mb-3`}
            />
            <label className="mb-1 block text-sm font-medium" htmlFor="ic_code">
              IC Code
            </label>
            <input
              id="ic_code"
              type="text"
              maxLength={100}
              placeholder="STM32F103C8T6"
              value={icCode}
              onChange={(e) => setIcCode(e.target.value)}
              className={`${inputClassName} mb-3`}
            />
            <div className="mb-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="pin_count">
                  {t('quote:fields.pin_count')} *
                </label>
                <input
                  id="pin_count"
                  type="number"
                  min={1}
                  required
                  value={pinCount}
                  onChange={(e) => setPinCount(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="pitch">
                  Pitch (mm) *
                </label>
                <select
                  id="pitch"
                  required
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">—</option>
                  {PITCH_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p === 'custom' ? t('quote:fields.pitch_custom') : p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {pitch === 'custom' && (
              <input
                id="pitch_custom"
                type="text"
                placeholder="0.35"
                required
                value={pitchCustom}
                onChange={(e) => setPitchCustom(e.target.value)}
                className={`${inputClassName} mb-3`}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm" htmlFor="package_d">
                  D (mm) *
                </label>
                <input
                  id="package_d"
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="100"
                  required
                  value={packageD}
                  onChange={(e) => setPackageD(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" htmlFor="package_e">
                  E (mm) *
                </label>
                <input
                  id="package_e"
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="100"
                  required
                  value={packageE}
                  onChange={(e) => setPackageE(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            <label className="mb-1 mt-3 block text-sm" htmlFor="package_a">
              A / Height (mm)
            </label>
            <input
              id="package_a"
              type="number"
              step="0.001"
              min="0.001"
              max="50"
              value={packageA}
              onChange={(e) => setPackageA(e.target.value)}
              className={inputClassName}
            />
          </fieldset>

          <fieldset className="rounded-lg border border-gray-light p-4">
            <legend className="px-1 font-semibold text-navy">
              {t('quote:sections.contact')}
            </legend>
            <label className="mb-1 mt-2 block text-sm font-medium" htmlFor="company_name">
              {t('quote:fields.company')} *
            </label>
            <input
              id="company_name"
              type="text"
              required
              maxLength={100}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={`${inputClassName} mb-3`}
            />
            <div className="mb-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm" htmlFor="contact_name">
                  {t('quote:fields.name')} *
                </label>
                <input
                  id="contact_name"
                  type="text"
                  required
                  maxLength={50}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" htmlFor="contact_phone">
                  {t('quote:fields.phone')}
                </label>
                <input
                  id="contact_phone"
                  type="tel"
                  maxLength={30}
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            <label className="mb-1 block text-sm" htmlFor="contact_email">
              Email *
            </label>
            <input
              id="contact_email"
              type="email"
              required
              maxLength={254}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClassName}
            />
          </fieldset>

          <fieldset className="rounded-lg border border-gray-light p-4">
            <legend className="px-1 font-semibold text-navy">
              {t('quote:sections.optional')}
            </legend>
            <div className="mb-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm" htmlFor="quantity">
                  {t('quote:fields.quantity')}
                </label>
                <input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" htmlFor="desired_delivery">
                  {t('quote:fields.desired_delivery')}
                </label>
                <input
                  id="desired_delivery"
                  type="date"
                  lang={lang}
                  value={desiredDelivery}
                  onChange={(e) => setDesiredDelivery(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            <label className="mb-1 block text-sm" htmlFor="message">
              {t('quote:fields.message')}
            </label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputClassName}
            />
          </fieldset>

          <PrivacyConsent
            checked={privacyAgreed}
            onChange={setPrivacyAgreed}
            label={
              isKo ? (
                <>
                  <Link
                    to={withLang(lang, '/privacy')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky"
                  >
                    개인정보처리방침
                  </Link>
                  에 동의합니다. (필수)
                </>
              ) : (
                <>
                  I agree to the{' '}
                  <Link
                    to={withLang(lang, '/privacy')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky"
                  >
                    Privacy Policy
                  </Link>
                  . (required)
                </>
              )
            }
          />
          <p className="text-xs text-gray-mid">
            {t('quote:nda_before')}
            <a href="mailto:sbchung@innovotech.co.kr" className="text-sky">
              sbchung@innovotech.co.kr
            </a>
            {t('quote:nda_after')}
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-sky py-3 font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('quote:submit')}
          </button>
          {alert && <FormAlert variant={alert.variant} message={alert.message} />}
        </form>
      </section>
    </>
  );
}
