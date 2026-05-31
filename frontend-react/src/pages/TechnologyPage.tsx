import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { mediaUrl } from '@/lib/media';

type EquipmentItem = {
  id: string;
  name: string;
  image: string;
};

export function TechnologyPage() {
  const { t } = useTranslation(['technology', 'common']);

  const equipment = t('technology:equipment', { returnObjects: true }) as {
    title: string;
    items: EquipmentItem[];
  };

  return (
    <>
      <Helmet>
        <title>{t('technology:meta.title')}</title>
      </Helmet>

      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <Breadcrumb variant="light" items={[{ label: t('common:nav.technology') }]} />
          <h1 className="mb-3 text-3xl font-bold text-white">{t('technology:hero.title')}</h1>
          <p className="max-w-2xl text-slate-300">{t('technology:hero.lead')}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="mb-3 text-xl font-bold">{t('technology:simulation.title')}</h2>
            <p className="leading-relaxed text-gray-mid">{t('technology:simulation.body')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              src={mediaUrl('/upload/technology/simulation/IC_loading_simulation.png')}
              alt=""
              className="rounded border border-gray-light bg-white p-2"
            />
            <img
              src={mediaUrl('/upload/technology/simulation/pin_align_simulation.png')}
              alt=""
              className="rounded border border-gray-light bg-white p-2"
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <img
              src={mediaUrl('/upload/technology/design/probe_pin_design.png')}
              alt=""
              className="mx-auto max-w-md rounded border border-gray-light bg-white p-2"
            />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="mb-3 text-xl font-bold">{t('technology:optimization.title')}</h2>
            <p className="mb-6 leading-relaxed text-gray-mid">{t('technology:optimization.body')}</p>
            <h2 className="mb-3 text-xl font-bold">{t('technology:high_current.title')}</h2>
            <p className="leading-relaxed text-gray-mid">{t('technology:high_current.body')}</p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-xl font-bold">{equipment.title}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {equipment.items.map((eq) => (
              <figure
                key={eq.id}
                className="overflow-hidden rounded-lg border border-gray-light bg-white"
              >
                <img
                  src={mediaUrl(eq.image)}
                  alt=""
                  className="h-40 w-full bg-slate-50 object-contain p-3"
                />
                <figcaption className="p-3 text-center text-sm font-medium">{eq.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-3 text-xl font-bold">{t('technology:patents.title')}</h2>
          <p className="text-gray-mid">{t('technology:patents.body')}</p>
        </div>
      </section>
    </>
  );
}
