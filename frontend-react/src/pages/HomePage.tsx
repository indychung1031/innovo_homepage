import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';

import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';

type TeaserItem = {
  slug: string;
  title: string;
  body: string;
  images?: string[];
};

export function HomePage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const { t } = useTranslation(['home', 'common']);

  const stats = t('home:stats', { returnObjects: true }) as {
    title: string;
    visible: boolean;
    items: { label: string; value: string }[];
  };
  const values = t('home:values', { returnObjects: true }) as {
    title: string;
    items: { title: string; body: string }[];
  };
  const teaser = t('home:teaser', { returnObjects: true }) as {
    title: string;
    items: TeaserItem[];
  };

  return (
    <>
      <Helmet>
        <title>{t('home:meta.title')}</title>
      </Helmet>

      <section
        className="relative bg-navy py-16 text-white md:py-24"
        style={{ backgroundImage: `url(${mediaUrl('/upload/images/hero_bg.png')})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-navy/70" />
        <div className="relative mx-auto max-w-6xl px-4">
          <p className="mb-2 font-medium text-sky">{t('home:hero.tagline')}</p>
          <h1 className="mb-4 max-w-3xl text-3xl font-bold text-white md:text-5xl">{t('home:hero.title')}</h1>
          <p className="mb-8 max-w-2xl text-lg text-slate-300">{t('home:hero.subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={withLang(lang, '/quote')}
              className="inline-flex rounded bg-sky px-6 py-3 font-medium text-white hover:opacity-95"
            >
              {t('common:cta.quote')}
            </Link>
            <Link
              to={withLang(lang, '/products')}
              className="inline-flex rounded bg-white px-6 py-3 font-medium text-navy hover:bg-slate-100"
            >
              {t('common:cta.explore_products')}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-2xl font-bold">{values.title}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.items.map((item, index) => (
              <article
                key={item.title}
                className="rounded-lg border border-gray-light p-5 transition-shadow hover:shadow-sm"
              >
                <span className="font-display text-lg font-bold text-sky">{index + 1}</span>
                <h3 className="mb-2 mt-2 font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-mid">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {stats.visible && (
        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h2 className="mb-8 text-2xl font-bold">{stats.title}</h2>
            <div className="mx-auto grid max-w-2xl grid-cols-3 gap-6">
              {stats.items.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-navy">{stat.value}</p>
                  <p className="mt-1 text-sm text-gray-mid">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-2 text-2xl font-bold">{t('home:map.title')}</h2>
          <p className="mb-6 max-w-2xl text-gray-mid">{t('home:map.caption')}</p>
          <figure className="overflow-hidden rounded-lg border border-gray-light">
            <img
              src={mediaUrl('/upload/images/global_delivery.jpg')}
              alt={lang === 'ko' ? '이노보솔루션 글로벌 납품 현황' : 'Innovo Solution global delivery'}
              className="h-auto w-full"
              width={1200}
              height={600}
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-2xl font-bold">{teaser.title}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {teaser.items.map((item) => (
              <Link
                key={item.slug}
                to={withLang(lang, `/products/${item.slug}`)}
                className="group block overflow-hidden rounded-lg border border-gray-light bg-white transition-shadow hover:shadow-md"
              >
                {item.images && item.images.length > 0 ? (
                  <div className="flex h-40 overflow-hidden bg-slate-100">
                    {item.images.map((img, idx) => (
                      <div
                        key={img}
                        className={`flex flex-1 items-center justify-center p-3 ${idx < item.images!.length - 1 ? 'border-r border-slate-200' : ''}`}
                      >
                        <img
                          src={mediaUrl(img)}
                          alt={item.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center bg-slate-100 font-display text-xl text-navy/30">
                    {item.title}
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-semibold transition-colors group-hover:text-sky">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-mid">{item.body}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-sky">
                    {t('common:cta.view_details')} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white">{t('home:bottom_cta.title')}</h2>
          <p className="mx-auto mb-6 max-w-xl text-slate-300">{t('home:bottom_cta.body')}</p>
          <Link
            to={withLang(lang, '/quote')}
            className="inline-flex rounded bg-white px-6 py-3 font-medium text-navy hover:bg-slate-100"
          >
            {t('common:cta.quote')}
          </Link>
        </div>
      </section>
    </>
  );
}
