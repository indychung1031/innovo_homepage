import { EMPTY_DRAFT, storageKey, type WizardDraft } from '@/features/quote-wizard/types';
import type { LangCode } from '@/lib/lang';

export function loadWizardDraft(userId: number, lang: LangCode): WizardDraft {
  try {
    const raw = localStorage.getItem(storageKey(userId, lang));
    if (!raw) {
      return { ...EMPTY_DRAFT };
    }
    const parsed = JSON.parse(raw) as Partial<WizardDraft>;
    return { ...EMPTY_DRAFT, ...parsed, version: 1 };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

export function saveWizardDraft(userId: number, lang: LangCode, draft: WizardDraft): void {
  localStorage.setItem(storageKey(userId, lang), JSON.stringify(draft));
}

export function clearWizardDraft(userId: number, lang: LangCode): void {
  localStorage.removeItem(storageKey(userId, lang));
}
