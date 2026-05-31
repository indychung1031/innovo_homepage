import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { isLangCode, type LangCode, withLang } from '@/lib/lang';

type PrivacyConsentProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
};

export function PrivacyConsent({ checked, onChange, label }: PrivacyConsentProps) {
  const { lang: langParam } = useParams();
  const lang: LangCode = isLangCode(langParam) ? langParam : 'en';
  const isKo = lang === 'ko';

  const defaultLabel = isKo ? (
    <>
      <Link to={withLang(lang, '/privacy')} className="text-sky" target="_blank" rel="noopener noreferrer">
        개인정보처리방침
      </Link>{' '}
      (필수)
    </>
  ) : (
    <>
      <Link to={withLang(lang, '/privacy')} className="text-sky" target="_blank" rel="noopener noreferrer">
        Privacy Policy
      </Link>{' '}
      (required)
    </>
  );

  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
        className="mt-1"
      />
      <span>{label ?? defaultLabel}</span>
    </label>
  );
}

export const inputClassName = 'w-full rounded border border-gray-light px-3 py-2';
