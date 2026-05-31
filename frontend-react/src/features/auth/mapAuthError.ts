import type { TFunction } from 'i18next';

import { parseApiError } from '@/api/errors';

/** API detail → auth 네임스페이스 errors 키 또는 원문 */
export function mapAuthError(detail: unknown, t: TFunction<'auth'>): string {
  const raw = parseApiError(detail, '');
  if (!raw) {
    return t('errors.generic');
  }

  const knownKeys = [
    'email_not_verified',
    'password_mismatch',
    'password_weak',
    'consent_required',
  ] as const;

  for (const key of knownKeys) {
    if (raw.includes(key)) {
      const msg = t(`errors.${key}`);
      if (msg !== `errors.${key}`) {
        return msg;
      }
    }
  }

  const byMessage = t(`errors.${raw}`);
  if (byMessage !== `errors.${raw}`) {
    return byMessage;
  }

  return raw;
}
