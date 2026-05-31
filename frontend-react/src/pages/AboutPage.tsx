import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FaqAccordion, type FaqItem } from '@/components/ui/FaqAccordion';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';

type TimelineItem = { year: string; text: string };

export function AboutPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['about', 'common']);

  const timeline = t('about:timeline', { returnObjects: true }) as {
    title: string;
    items: TimelineItem[];
  };
  const faq = t('about:faq', { returnObjects: true }) as { title: string; items: FaqItem[] };
  const org = t('about:org', { returnObjects: true }) as {
    title: string;
    ceo: string;
    image_alt: string;
    departments: string[];
  };
  const vision = t('about:vision', { returnObjects: true }) as {
    title: string;
    goal: string;
    pillars: string;
    image_alt: string;
  };

  const heroAlt =
    lang === 'ko'
      ? '이노보솔루션 — 고객과 함께 성장하는 파트너'
      : 'Innovo Solution — Growing together with our customers';

  const isoSrc =
    lang === 'ko'
      ? mediaUrl('/upload/certificate/iso9001_2024_ko.png')
      : mediaUrl('/upload/certificate/iso9001_2024_en.png');
  const isoAlt = lang === 'ko' ? 'ISO 9001:2015 인증서' : 'ISO 9001:2015 Certificate';

  return (
    <>
      <Helmet>
        <title>{t('about:meta.title')}</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white">
        <div className="w-full">
          <img
            src={mediaUrl('/upload/about/intro_hero.png')}
            alt={heroAlt}
            className="h-56 w-full object-cover sm:h-72 md:h-96"
            width={1200}
            height={480}
            loading="eager"
          />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <Breadcrumb items={[{ label: t('common:nav.about') }]} />
          <h1 className="mb-3 text-3xl font-bold">{t('about:intro.title')}</h1>
          <p className="mb-4 text-xl font-semibold text-navy">{t('about:intro.lead')}</p>
          <p className="max-w-2xl text-base leading-relaxed text-gray-mid">{t('about:intro.body')}</p>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-6 text-xl font-bold">{vision.title}</h2>
          <figure className="overflow-hidden rounded-lg border border-gray-light bg-white shadow-sm">
            <img
              src={mediaUrl('/upload/about/vision_values.png')}
              alt={vision.image_alt}
              className="h-auto w-full"
              width={1200}
              height={675}
              loading="lazy"
            />
          </figure>
          <p className="sr-only">
            {vision.goal}. {vision.pillars}
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-6 text-xl font-bold">{org.title}</h2>
          <figure className="overflow-hidden rounded-lg border border-gray-light bg-white shadow-sm">
            <img
              src={mediaUrl('/upload/about/organization.png')}
              alt={org.image_alt}
              className="h-auto w-full"
              width={1200}
              height={675}
              loading="lazy"
            />
          </figure>
          <p className="sr-only">
            {org.ceo}. {org.departments.join(', ')}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-6 text-xl font-bold">{timeline.title}</h2>
          <ol className="space-y-6 border-l-2 border-sky pl-6">
            {timeline.items.map((item) => (
              <li key={`${item.year}-${item.text}`}>
                <span className="font-bold text-navy">{item.year}</span>
                <p className="mt-1 text-gray-mid">{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-6 text-xl font-bold">{t('about:iso.title')}</h2>
          <figure style={{ width: 240 }}>
            <img
              src={isoSrc}
              alt={isoAlt}
              className="h-auto w-full rounded-lg border border-gray-light shadow-sm"
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      <section className="bg-slate-50 py-14" id="faq">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-6 text-xl font-bold">{faq.title}</h2>
          <FaqAccordion items={faq.items} />
        </div>
      </section>

      <section className="py-10 text-center">
        <Link
          to={withLang(lang, '/contact')}
          className="inline-flex rounded bg-navy px-6 py-3 font-medium text-white hover:opacity-95"
        >
          {t('common:cta.contact_us')}
        </Link>
      </section>
    </>
  );
}
