import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';

import { isLangCode, type LangCode, withLang } from '@/lib/lang';

export function NotFoundPage() {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';

  return (
    <>
      <Helmet>
        <title>
          {lang === 'ko' ? '페이지를 찾을 수 없음' : 'Page Not Found'} | Innovo Solution
        </title>
      </Helmet>
      <section className="py-24 text-center">
        <div className="mx-auto max-w-md px-4">
          <p className="text-6xl font-bold text-navy">404</p>
          <h1 className="mb-3 mt-4 text-2xl font-bold">
            {lang === 'ko' ? '페이지를 찾을 수 없습니다' : 'Page Not Found'}
          </h1>
          <p className="mb-8 text-gray-mid">
            {lang === 'ko'
              ? '요청하신 페이지가 존재하지 않거나 이동되었습니다.'
              : 'The page you requested does not exist or has been moved.'}
          </p>
          <Link
            to={withLang(lang, '/')}
            className="inline-flex rounded bg-navy px-6 py-3 font-medium text-white hover:opacity-95"
          >
            {lang === 'ko' ? '홈으로 돌아가기' : 'Back to Home'}
          </Link>
        </div>
      </section>
    </>
  );
}
