import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { isLangCode, type LangCode } from '@/lib/lang';

type PlaceholderPageProps = {
  title: string;
  sprint?: string;
};

/** S1 이후 구현 예정 페이지 스텁 */
export function PlaceholderPage({ title, sprint = 'S1+' }: PlaceholderPageProps) {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';

  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <Helmet>
          <title>
            {title} — Innovo Solution
          </title>
        </Helmet>
        <h1 className="mb-4 text-2xl font-bold">{title}</h1>
        <p className="text-gray-mid">
          {lang === 'ko'
            ? `이 페이지는 React 마이그레이션 ${sprint} 단계에서 구현됩니다.`
            : `This page will be implemented in sprint ${sprint}.`}
        </p>
      </div>
    </section>
  );
}
