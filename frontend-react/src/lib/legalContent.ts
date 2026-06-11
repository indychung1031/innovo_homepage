import privacyEn from '@content/legal/privacy.en.json';
import privacyKo from '@content/legal/privacy.ko.json';
import termsEn from '@content/legal/terms.en.json';
import termsKo from '@content/legal/terms.ko.json';

import type { LangCode } from '@/lib/lang';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  paragraphs_after?: string[];
  list?: string[];
  table?: { headers: string[]; rows: string[][] };
};

export type LegalDocument = {
  meta: { title: string; effective_date: string; version: string };
  intro: string;
  sections: LegalSection[];
};

export type LegalDocKind = 'privacy' | 'terms';

const DOCS: Record<LegalDocKind, Record<LangCode, LegalDocument>> = {
  privacy: { en: privacyEn as LegalDocument, ko: privacyKo as LegalDocument },
  terms: { en: termsEn as LegalDocument, ko: termsKo as LegalDocument },
};

export function getLegalDocument(kind: LegalDocKind, lang: LangCode): LegalDocument {
  return DOCS[kind][lang];
}

/** Jinja 템플릿의 /{lang}/ 경로 치환 */
export function formatLegalText(text: string, lang: LangCode): string {
  return text
    .replace(/\{lang\}/g, lang)
    .replace(/\/\{lang\}\//g, `/${lang}/`);
}
