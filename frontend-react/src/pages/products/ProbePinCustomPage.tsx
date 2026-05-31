import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { isLangCode, type LangCode, withLang } from '@/lib/lang';
import { mediaUrl } from '@/lib/media';

const OPTION_BLOCKS = [
  {
    titleEn: 'Tip Shape',
    titleKo: '팁 형상',
    itemsEn: ['Flat', 'Round', 'Crown', 'Spear', 'Chisel', 'Serrated', 'Custom (drawing required)'],
    itemsKo: ['Flat', 'Round', 'Crown', 'Spear', 'Chisel', 'Serrated', '고객 도면 기준'],
  },
  {
    titleEn: 'Pitch & Diameter',
    titleKo: '피치 및 외경',
    itemsEn: ['Pitch: 0.3 mm and above', 'O.D.: Customer specified', 'Barrel length: Customizable'],
    itemsKo: ['피치: 0.3 mm 이상', '외경: 고객 사양에 따름', '배럴 길이: 맞춤 제작'],
  },
  {
    titleEn: 'Current Rating',
    titleKo: '전류 용량',
    itemsEn: ['Standard: up to 3 A', 'High current: up to 30 A+', 'Custom current path design'],
    itemsKo: ['표준: 3 A 이하', '고전류: 30 A 이상', '전류 경로 맞춤 설계'],
  },
  {
    titleEn: 'Spring Force',
    titleKo: '스프링 하중',
    itemsEn: ['Light / Medium / Heavy', 'Custom spring specification'],
    itemsKo: ['경·중·강 하중', '스프링 사양 맞춤 적용'],
  },
  {
    titleEn: 'Plating',
    titleKo: '도금',
    itemsEn: ['Gold (Au)', 'Nickel (Ni)', 'Palladium-Nickel (PdNi)', 'Custom alloy on request'],
    itemsKo: ['금 (Au)', '니켈 (Ni)', '팔라듐-니켈 (PdNi)', '고객 요청 합금'],
  },
  {
    titleEn: 'Operating Temperature',
    titleKo: '동작 온도',
    itemsEn: ['Standard: -40 ~ 125 °C', 'Extended: -55 ~ 185 °C'],
    itemsKo: ['표준: -40 ~ 125 °C', '확장: -55 ~ 185 °C'],
  },
] as const;

export function ProbePinCustomPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';

  const title = isKo ? '맞춤형 프로브 핀' : 'Customized Probe Pin';
  const pageTitle = isKo ? `${title} | 이노보솔루션` : `${title} | Innovo Solution`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>

      <section className="border-b border-gray-light bg-white">
        <div className="w-full">
          <img
            src={mediaUrl('/upload/products/probe_pin_custom_hero.png')}
            alt={
              isKo
                ? '맞춤형 프로브 핀 — 이노보솔루션'
                : 'Customized Probe Pin — Innovo Solution'
            }
            className="h-56 w-full object-cover sm:h-72 md:h-96"
            width={1200}
            height={480}
            loading="eager"
          />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-10">
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
              ? '고객의 테스트 요구 사양에 맞춰 프로브 핀을 설계·제작합니다. 아래 옵션을 참고하여 상담을 요청하세요.'
              : 'We design and manufacture probe pins tailored to your exact test requirements. Select your parameters below and consult with our engineers.'}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-xl font-semibold text-navy">
            {isKo ? '커스터마이징 옵션' : 'Customization Options'}
          </h2>
          <div className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {OPTION_BLOCKS.map((block) => (
              <div key={block.titleEn} className="rounded-lg border border-gray-light bg-white p-5">
                <h3 className="mb-3 font-semibold">{isKo ? block.titleKo : block.titleEn}</h3>
                <ul className="space-y-1 text-sm text-gray-mid">
                  {(isKo ? block.itemsKo : block.itemsEn).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            to={withLang(lang, '/products/probe-pin')}
            className="text-sm text-gray-mid hover:text-navy"
          >
            ← {isKo ? 'Probe Pin 목록으로' : 'Back to Probe Pin'}
          </Link>
        </div>
      </section>

      <section className="bg-navy py-16 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-3 text-2xl font-bold">{isKo ? '맞춤 제작 문의하기' : 'Ready to get started?'}</h2>
          <p className="mb-8 text-slate-300">
            {isKo
              ? '사양을 전달해 주시면 엔지니어가 영업일 1일 이내에 회신드립니다.'
              : 'Share your specifications and our engineers will get back to you within 1 business day.'}
          </p>
          <Link
            to={{ pathname: withLang(lang, '/contact'), search: '?category=probe_pin' }}
            className="inline-flex items-center rounded bg-white px-8 py-3 font-semibold text-navy transition-colors hover:bg-slate-100"
          >
            {isKo ? '상담 요청' : 'Consult with Us'}
          </Link>
        </div>
      </section>
    </>
  );
}
