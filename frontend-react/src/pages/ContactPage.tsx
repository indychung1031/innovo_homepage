import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

import {
  HP_MAX_ATTACHMENT_BYTES,
  submitContact,
  type ContactCategory,
} from '@/api/contact';
import { fetchPins } from '@/api/erp';
import { FormAlert } from '@/components/forms/FormAlert';
import { inputClassName, PrivacyConsent } from '@/components/forms/PrivacyConsent';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';
import { buildPinInquiryMessage } from '@/lib/products/pinSpecFormat';
import { getRecaptchaToken, loadRecaptchaScript } from '@/lib/recaptcha';

const CATEGORY_KEYS: ContactCategory[] = ['test_socket', 'probe_pin', 'test_jig', 'other'];

const MAPS_URL: Record<LangCode, string> = {
  en: 'https://www.google.com/maps/search/?api=1&query=12%2C+Galmachi-ro+203beon-gil%2C+Jungwon-gu%2C+Seongnam-si%2C+Gyeonggi-do%2C+Korea&hl=en',
  ko: 'https://www.google.com/maps/search/?api=1&query=%EA%B2%BD%EA%B8%B0%EB%8F%84+%EC%84%B1%EB%82%A8%EC%8B%9C+%EC%A4%91%EC%9B%90%EA%B5%AC+%EA%B0%88%EB%A7%88%EC%B9%98%EB%A1%9C203%EB%B2%88%EA%B8%B8+12&hl=ko',
};

function isContactCategory(value: string | null): value is ContactCategory {
  return CATEGORY_KEYS.includes(value as ContactCategory);
}

export function ContactPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['contact', 'common']);
  const [searchParams] = useSearchParams();
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

  const initialCategory = useMemo(() => {
    const fromUrl = searchParams.get('category');
    return isContactCategory(fromUrl) ? fromUrl : 'test_socket';
  }, [searchParams]);

  const [category, setCategory] = useState<ContactCategory>(initialCategory);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void loadRecaptchaScript(recaptchaKey);
  }, [recaptchaKey]);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const modelsParam = searchParams.get('model');
    if (!modelsParam) {
      return;
    }
    const models = modelsParam
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    if (models.length === 0) {
      return;
    }
    void (async () => {
      try {
        const pins = await fetchPins();
        const matched = pins.filter((pin) => models.includes(pin.pin_name));
        if (matched.length > 0) {
          setMessage(buildPinInquiryMessage(matched, lang === 'ko'));
        } else {
          setMessage(models.join(', '));
        }
      } catch {
        setMessage(models.join(', '));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const categories = t('contact:form.categories', { returnObjects: true }) as Record<string, string>;
  const mapsUrl = MAPS_URL[lang];
  const mapAlt =
    lang === 'ko'
      ? '이노보솔루션 위치 — Google 지도에서 보기'
      : 'Innovo Solution location — Open in Google Maps';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setAlert(null);
    setSubmitting(true);

    try {
      const token = await getRecaptchaToken(recaptchaKey, 'contact');
      const result = await submitContact(
        {
          category,
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          contact_phone: contactPhone.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
          privacy_agreed: privacyAgreed,
          recaptcha_token: token,
          lang,
        },
        attachment,
      );
      setAlert({ variant: 'success', message: result.message });
      setCompanyName('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setSubject('');
      setMessage('');
      setAttachment(null);
      setPrivacyAgreed(false);
      const fileInput = document.getElementById('attachment') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
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
        <title>{t('contact:meta.title')}</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <Breadcrumb items={[{ label: t('common:nav.contact') }]} />
          <h1 className="mb-3 text-3xl font-bold">{t('contact:title')}</h1>
          <p className="max-w-3xl rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('contact:nda_notice')}
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-semibold text-navy">{t('common:footer.company')}</h2>
            <p className="mb-4 text-gray-mid">{t('common:footer.address')}</p>
            <ul className="space-y-2 text-sm">
              <li>
                <strong>{t('contact:info.tel')}:</strong> 031-735-6141~2
              </li>
              <li>
                <strong>{t('contact:info.fax')}:</strong> 031-735-6145
              </li>
              <li>
                <strong>{t('contact:info.email')}:</strong>{' '}
                <a href="mailto:sbchung@innovotech.co.kr" className="text-sky">
                  sbchung@innovotech.co.kr
                </a>
              </li>
            </ul>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 block aspect-video overflow-hidden rounded-lg border border-gray-light"
            >
              <img
                src={mediaUrl('/upload/contact/location_map.png')}
                alt={mapAlt}
                className="h-full w-full object-cover transition-opacity group-hover:opacity-95"
                width={640}
                height={360}
                loading="lazy"
              />
            </a>
            <p className="mt-2 text-sm">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-sky hover:underline">
                {lang === 'ko' ? 'Google 지도에서 보기' : 'Open in Google Maps'}
              </a>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium">
                {t('contact:form.category')} *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactCategory)}
                required
                className={inputClassName}
              >
                {CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {categories[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="company_name" className="mb-1 block text-sm font-medium">
                {t('contact:form.company_name')} *
              </label>
              <input
                id="company_name"
                type="text"
                required
                maxLength={100}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="contact_name" className="mb-1 block text-sm font-medium">
                  {t('contact:form.contact_name')} *
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
                <label htmlFor="contact_phone" className="mb-1 block text-sm font-medium">
                  {t('contact:form.contact_phone')}
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
            <div>
              <label htmlFor="contact_email" className="mb-1 block text-sm font-medium">
                {t('contact:form.contact_email')} *
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
            </div>
            <div>
              <label htmlFor="subject" className="mb-1 block text-sm font-medium">
                {t('contact:form.subject')} *
              </label>
              <input
                id="subject"
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="message" className="mb-1 block text-sm font-medium">
                {t('contact:form.message')} *
              </label>
              <textarea
                id="message"
                required
                maxLength={5000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="attachment" className="mb-1 block text-sm font-medium">
                {t('contact:form.attachment')}
              </label>
              <input
                id="attachment"
                type="file"
                accept=".pdf,.dxf,.step,.stp"
                className="w-full text-sm text-charcoal"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > HP_MAX_ATTACHMENT_BYTES) {
                    setAlert({
                      variant: 'error',
                      message:
                        lang === 'ko'
                          ? '파일 크기는 10MB 이하여야 합니다.'
                          : 'File must be 10MB or less.',
                    });
                    e.target.value = '';
                    setAttachment(null);
                    return;
                  }
                  setAttachment(file);
                }}
              />
              <p className="mt-1 text-xs text-gray-mid">{t('contact:form.attachment_hint')}</p>
            </div>
            <PrivacyConsent checked={privacyAgreed} onChange={setPrivacyAgreed} />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-navy py-3 font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('contact:form.submit')}
            </button>
            {alert && <FormAlert variant={alert.variant} message={alert.message} />}
          </form>
        </div>
      </section>
    </>
  );
}
