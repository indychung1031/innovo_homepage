export function formatKrw(amount: number, lang: 'en' | 'ko'): string {
  const formatted = new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US').format(amount);
  return lang === 'ko' ? `₩ ${formatted}` : `KRW ${formatted}`;
}
