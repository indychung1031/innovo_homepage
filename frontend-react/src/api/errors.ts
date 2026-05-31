/** FastAPI validation 오류 등 API detail 파싱 */
export function parseApiError(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return String(item);
      })
      .join(', ');
  }
  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  return fallback;
}
