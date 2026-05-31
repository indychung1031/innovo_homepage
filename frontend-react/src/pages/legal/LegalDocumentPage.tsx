import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { formatLegalText, getLegalDocument, type LegalDocKind } from '@/lib/legalContent';
import { isLangCode, type LangCode } from '@/lib/lang';

type LegalDocumentPageProps = {
  kind: LegalDocKind;
};

export function LegalDocumentPage({ kind }: LegalDocumentPageProps) {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const doc = getLegalDocument(kind, lang);
  const isKo = lang === 'ko';

  return (
    <article className="legal-doc mx-auto max-w-3xl px-4 py-12">
      <Helmet>
        <title>
          {doc.meta.title} | Innovo Solution
        </title>
      </Helmet>
      <header className="mb-8">
        <Breadcrumb items={[{ label: doc.meta.title }]} />
        <h1 className="mb-2 text-3xl font-bold">{doc.meta.title}</h1>
        <p className="text-sm text-gray-mid">
          {isKo
            ? `시행일: ${doc.meta.effective_date} · 버전 ${doc.meta.version}`
            : `Effective: ${doc.meta.effective_date} · Version ${doc.meta.version}`}
        </p>
      </header>

      <p className="mb-8 text-lg leading-relaxed">{formatLegalText(doc.intro, lang)}</p>

      {doc.sections.map((section) => (
        <section key={section.id} id={section.id} className="mb-8">
          <h2 className="mb-3 border-b border-gray-light pb-2 text-lg font-semibold">{section.title}</h2>
          {section.paragraphs?.map((para, i) => (
            <p key={`p-${i}`} className="mb-3 leading-relaxed">
              {formatLegalText(para, lang)}
            </p>
          ))}
          {section.table ? (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {section.table.headers.map((h) => (
                      <th
                        key={h}
                        className="border border-gray-light px-3 py-2 text-left font-semibold text-navy"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, ri) => (
                    <tr key={ri} className="even:bg-slate-50/50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-gray-light px-3 py-2 align-top">
                          {formatLegalText(cell, lang)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {section.list ? (
            <ul className="mb-3 list-disc space-y-1 pl-5">
              {section.list.map((item, i) => (
                <li key={i}>{formatLegalText(item, lang)}</li>
              ))}
            </ul>
          ) : null}
          {section.paragraphs_after?.map((para, i) => (
            <p key={`pa-${i}`} className="mb-3 leading-relaxed">
              {formatLegalText(para, lang)}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
