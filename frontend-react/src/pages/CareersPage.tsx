import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode } from '@/lib/lang';

const HR_EMAIL = 'sbchung@innovotech.co.kr';

export function CareersPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation('careers');

  type ValueItem = { title: string; body: string };
  const values = t('values', { returnObjects: true }) as ValueItem[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Helmet>
        <title>{t('title')} | Innovo Solution</title>
      </Helmet>
      <Breadcrumb items={[{ label: t('title') }]} />

      {/* Hero */}
      <h1 className="mb-3 text-3xl font-bold text-navy">{t('hero_heading')}</h1>
      <p className="mb-10 text-lg leading-relaxed text-charcoal">{t('hero_body')}</p>

      {/* 모집 직군 */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-navy">{t('positions_heading')}</h2>
        <div className="rounded-lg border border-gray-light bg-white px-6 py-8 text-center">
          <p className="mb-2 text-lg font-semibold text-charcoal">{t('no_positions_heading')}</p>
          <p className="mb-4 text-gray-mid">
            {t('no_positions_body')}{' '}
            <a
              href={`mailto:${HR_EMAIL}`}
              className="text-sky hover:underline"
            >
              {HR_EMAIL}
            </a>
          </p>
          <a
            href={`mailto:${HR_EMAIL}?subject=${encodeURIComponent(lang === 'ko' ? '[채용문의] 이름 / 직군' : '[Career Inquiry] Name / Position')}`}
            className="inline-block rounded bg-navy px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t('contact_label')}
          </a>
        </div>
      </section>

      {/* 이노보솔루션과 함께해야 하는 이유 */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-navy">{t('values_heading')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="rounded-lg border border-gray-light bg-white p-5">
              <p className="mb-2 font-semibold text-navy">{v.title}</p>
              <p className="text-sm text-gray-mid leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
