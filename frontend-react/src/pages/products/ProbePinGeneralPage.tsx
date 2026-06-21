import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { fetchPins, type PinSpec } from '@/api/erp';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

function formatSpec(value: string | number | null): string {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-gray-light/60 py-1 last:border-0">
      <span className="text-gray-mid">{label}</span>
      <span className="font-medium text-navy">{value}</span>
    </div>
  );
}

export function ProbePinGeneralPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';

  const [pins, setPins] = useState<PinSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchPins();
        setPins(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const title = 'General POGO Pin';
  const pageTitle = isKo ? `${title} | 이노보솔루션` : `${title} | Innovo Solution`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <Breadcrumb
            items={[
              { label: 'Products', href: withLang(lang, '/products') },
              { label: 'Probe Pin', href: withLang(lang, '/products/probe-pin') },
              { label: title },
            ]}
          />
          <h1 className="mb-3 text-3xl font-bold">{title}</h1>
          <p className="max-w-2xl text-gray-mid">
            {isKo
              ? '다양한 피치·전류·팁 사양을 갖춘 표준 카탈로그 POGO 핀.'
              : 'Standard catalog POGO pins covering a wide range of pitches, currents, and tip configurations.'}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          {loading && (
            <p className="py-8 text-center text-sm text-gray-mid">
              {isKo ? '모델 목록을 불러오는 중입니다...' : 'Loading model list...'}
            </p>
          )}

          {!loading && error && (
            <p className="mb-8 inline-block rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {isKo
                ? '스펙 데이터를 불러오지 못했습니다. 현재 카탈로그는 문의해 주세요.'
                : 'Unable to load specification data. Please contact us for the current catalog.'}
            </p>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pins.map((pin) => (
                <div
                  key={pin.pin_id}
                  className="flex flex-col rounded-lg border border-gray-light bg-white p-4"
                >
                  <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded bg-slate-50">
                    <img
                      src={`/upload/products/renders/probe_pin/${pin.pin_name}.png`}
                      alt={pin.pin_name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden text-xs text-gray-mid">
                      {isKo ? '이미지 준비 중' : 'Image coming soon'}
                    </span>
                  </div>

                  <p className="mb-2 truncate text-sm font-semibold text-navy" title={pin.pin_name}>
                    {pin.pin_name}
                  </p>

                  <div className="mb-3 flex-1 text-xs">
                    <SpecRow label={isKo ? '전체 길이 (mm)' : 'Total Length (mm)'} value={formatSpec(pin.total_length)} />
                    <SpecRow label={isKo ? '풀 스트로크 (mm)' : 'Full Stroke (mm)'} value={formatSpec(pin.full_stroke)} />
                    <SpecRow
                      label={isKo ? '권장 스트로크 (mm)' : 'Recommended Stroke (mm)'}
                      value={formatSpec(pin.recommended_stroke)}
                    />
                    <SpecRow
                      label={isKo ? '상부 팁 형상' : 'Top Plunger Shape'}
                      value={formatSpec(pin.top_plunger_shape)}
                    />
                    <SpecRow
                      label={isKo ? '하부 팁 형상' : 'Bottom Plunger Shape'}
                      value={formatSpec(pin.bottom_plunger_shape)}
                    />
                    <SpecRow label={isKo ? '접촉력' : 'Spring Force'} value={formatSpec(pin.spring_force)} />
                    <SpecRow
                      label={isKo ? '정격전류 (A)' : 'Max Current (A)'}
                      value={formatSpec(pin.current_continuous)}
                    />
                    <SpecRow label={isKo ? '접촉저항' : 'Resistance'} value={formatSpec(pin.resistance)} />
                    <SpecRow
                      label={isKo ? '대역폭 (GHz, -3dB)' : 'Bandwidth (GHz, -3dB)'}
                      value={formatSpec(pin.bandwidth3db)}
                    />
                  </div>

                  <Link
                    to={{ pathname: withLang(lang, '/contact'), search: `?category=probe_pin&model=${pin.pin_name}` }}
                    className="inline-flex items-center justify-center rounded bg-navy px-3 py-1.5 text-xs text-white hover:opacity-95"
                  >
                    {isKo ? '견적 문의' : 'Request a Quote'}
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 flex gap-4">
            <Link
              to={withLang(lang, '/products/probe-pin')}
              className="text-sm text-gray-mid hover:text-navy"
            >
              ← {isKo ? 'Probe Pin 목록으로' : 'Back to Probe Pin'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
