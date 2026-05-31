import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

export function ProbePinGeneralPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';

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
          <p className="mb-8 inline-block rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {isKo
              ? '상세 스펙 표 준비 중입니다. 현재 카탈로그는 문의해 주세요.'
              : 'Detailed specification table coming soon. Please contact us for current catalog.'}
          </p>

          <div className="overflow-hidden rounded-lg border border-gray-light bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-light bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-navy">{isKo ? '모델' : 'Model'}</th>
                  <th className="px-4 py-3 font-semibold text-navy">{isKo ? '피치 (mm)' : 'Pitch (mm)'}</th>
                  <th className="px-4 py-3 font-semibold text-navy">{isKo ? '외경 (mm)' : 'O.D. (mm)'}</th>
                  <th className="px-4 py-3 font-semibold text-navy">{isKo ? '스트로크 (mm)' : 'Stroke (mm)'}</th>
                  <th className="px-4 py-3 font-semibold text-navy">
                    {isKo ? '최대 전류 (A)' : 'Max Current (A)'}
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy">{isKo ? '동작 온도' : 'Operating Temp.'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-light">
                <tr className="text-gray-mid">
                  <td colSpan={6} className="px-4 py-8 text-center">
                    {isKo ? '— 스펙 데이터 준비 중 —' : '— Specification data will be added shortly —'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex gap-4">
            <Link
              to={withLang(lang, '/products/probe-pin')}
              className="text-sm text-gray-mid hover:text-navy"
            >
              ← {isKo ? 'Probe Pin 목록으로' : 'Back to Probe Pin'}
            </Link>
            <Link
              to={{ pathname: withLang(lang, '/contact'), search: '?category=probe_pin' }}
              className="inline-flex items-center rounded bg-navy px-5 py-2 text-sm text-white hover:opacity-95"
            >
              {isKo ? '견적 문의' : 'Request a Quote'}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
