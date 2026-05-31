import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';

const SECTIONS = [
  {
    title: 'High Current Pin',
    descKo: '대전류 테스트 환경에 최적화된 핀',
    descEn: 'Optimized for high-current test environments requiring stable contact under heavy load.',
  },
  {
    title: 'High Speed Pin',
    descKo: '고속 신호 전송에 적합한 저인덕턴스 핀',
    descEn: 'Low-inductance design for high-speed signal integrity in RF and digital applications.',
  },
  {
    title: 'Low Profile Pin',
    descKo: '공간 제약 환경을 위한 초저고 프로브 핀',
    descEn: 'Ultra-compact profile for space-constrained test fixtures and board-level testing.',
  },
  {
    title: 'Fine Pitch Pin',
    descKo: '미세 피치 패드에 대응하는 고정밀 핀',
    descEn: 'High-precision pins designed for fine-pitch pads and high-density interconnect testing.',
  },
] as const;

export function ProbePinSpecialPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';

  const title = 'Special POGO Pin';
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
              ? '고전류·고속·초미세 피치 등 고성능 특수 환경에 맞춘 프로브 핀.'
              : 'High-performance pins engineered for demanding applications — high current, high speed, and ultra-fine pitch.'}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl space-y-12 px-4">
          <p className="inline-block rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {isKo
              ? '상세 스펙 표 준비 중입니다. 현재 카탈로그는 문의해 주세요.'
              : 'Detailed specification tables coming soon. Please contact us for current catalog.'}
          </p>

          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="mb-2 text-xl font-semibold text-navy">{section.title}</h2>
              <p className="mb-4 text-sm text-gray-mid">{isKo ? section.descKo : section.descEn}</p>
              <div className="overflow-hidden rounded-lg border border-gray-light bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-light bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-navy">{isKo ? '모델' : 'Model'}</th>
                      <th className="px-4 py-3 font-semibold text-navy">{isKo ? '피치 (mm)' : 'Pitch (mm)'}</th>
                      <th className="px-4 py-3 font-semibold text-navy">{isKo ? '외경 (mm)' : 'O.D. (mm)'}</th>
                      <th className="px-4 py-3 font-semibold text-navy">
                        {isKo ? '최대 전류 (A)' : 'Max Current (A)'}
                      </th>
                      <th className="px-4 py-3 font-semibold text-navy">{isKo ? '비고' : 'Note'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-gray-mid">
                      <td colSpan={5} className="px-4 py-6 text-center">
                        {isKo ? '— 스펙 데이터 준비 중 —' : '— Specification data will be added shortly —'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex gap-4">
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
